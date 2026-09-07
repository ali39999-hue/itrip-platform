import crypto from 'crypto';
import { prisma } from '@/lib/prisma';
import { hasPiiViewPermission } from '@/lib/security/pii-masking';

export interface EncryptedDocumentPayload {
  algorithm: 'aes-256-gcm';
  version: 'v1';
  iv: string; // hex
  authTag: string; // hex
  ciphertext: string; // base64
  contentType?: string;
  metadata?: Record<string, unknown>;
}

export interface SignedDocumentTokenPayload {
  documentId: string;
  userId: string;
  organizationId?: string;
  issuedAt: number; // epoch ms
  expiresAt: number; // epoch ms
}

export interface StoredDocumentResult {
  documentId: string;
  type: string;
  encrypted: boolean;
  signedUrl: string;
  expiresAt: Date;
  storageRef?: string;
}

export interface RetrievedDocumentResult {
  documentId: string;
  type: string;
  documentNumber: string;
  holderName?: string | null;
  contentBuffer?: Buffer;
  contentType?: string;
  metadata?: Record<string, unknown>;
}

export class DocumentManagementService {
  public static readonly DEFAULT_TTL_SECONDS = 15 * 60; // 15 minutes TTL

  // In-memory encrypted document store for file buffers/scans linked to documentId
  private static encryptedPayloadStore = new Map<string, EncryptedDocumentPayload>();

  private static getMasterKey(): Buffer {
    const secret = process.env.ENCRYPTION_KEY || process.env.AUTH_SECRET || 'dev-insecure-master-key-32-chars-ok';
    return crypto.createHash('sha256').update(secret).digest();
  }

  private static getSigningKey(): string {
    return process.env.AUTH_SECRET || process.env.ENCRYPTION_KEY || 'dev-insecure-signing-secret';
  }

  /**
   * Encrypts a document buffer or string using AES-256-GCM.
   */
  static encrypt(
    content: Buffer | string,
    contentType?: string,
    metadata?: Record<string, unknown>
  ): EncryptedDocumentPayload {
    const key = this.getMasterKey();
    const iv = crypto.randomBytes(12); // Standard 96-bit IV for GCM
    const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);

    const inputBuffer = Buffer.isBuffer(content) ? content : Buffer.from(content, 'utf8');
    const ciphertext = Buffer.concat([cipher.update(inputBuffer), cipher.final()]);
    const authTag = cipher.getAuthTag();

    return {
      algorithm: 'aes-256-gcm',
      version: 'v1',
      iv: iv.toString('hex'),
      authTag: authTag.toString('hex'),
      ciphertext: ciphertext.toString('base64'),
      contentType: contentType || 'application/octet-stream',
      metadata,
    };
  }

  /**
   * Decrypts an AES-256-GCM encrypted document payload.
   */
  static decrypt(payload: EncryptedDocumentPayload): Buffer {
    if (payload.algorithm !== 'aes-256-gcm' || payload.version !== 'v1') {
      throw new Error('SECURITY_ERROR: Unsupported document encryption algorithm or version');
    }

    const key = this.getMasterKey();
    const iv = Buffer.from(payload.iv, 'hex');
    const authTag = Buffer.from(payload.authTag, 'hex');
    const ciphertext = Buffer.from(payload.ciphertext, 'base64');

    const decipher = crypto.createDecipheriv('aes-256-gcm', key, iv);
    decipher.setAuthTag(authTag);

    const decrypted = Buffer.concat([decipher.update(ciphertext), decipher.final()]);
    return decrypted;
  }

  /**
   * Generates an authorized signed retrieval URL for a document with 15-minute TTL.
   */
  static generateSignedRetrievalUrl(params: {
    documentId: string;
    userId: string;
    organizationId?: string;
    ttlSeconds?: number;
    baseUrl?: string;
  }): { signedUrl: string; token: string; expiresAt: Date } {
    const ttl = params.ttlSeconds ?? this.DEFAULT_TTL_SECONDS;
    const issuedAt = Date.now();
    const expiresAtMs = issuedAt + ttl * 1000;
    const expiresAt = new Date(expiresAtMs);

    const payload: SignedDocumentTokenPayload = {
      documentId: params.documentId,
      userId: params.userId,
      organizationId: params.organizationId,
      issuedAt,
      expiresAt: expiresAtMs,
    };

    const payloadBase64 = Buffer.from(JSON.stringify(payload)).toString('base64url');
    const signature = crypto
      .createHmac('sha256', this.getSigningKey())
      .update(payloadBase64)
      .digest('base64url');

    const token = `${payloadBase64}.${signature}`;
    const base = params.baseUrl || '/api/admin/documents';
    const signedUrl = `${base}/${params.documentId}?token=${token}`;

    return { signedUrl, token, expiresAt };
  }

  /**
   * Verifies an authorized signed retrieval token.
   * Validates HMAC signature and verifies that the 15-minute TTL has not expired.
   */
  static verifySignedRetrievalToken(token: string): {
    valid: boolean;
    payload?: SignedDocumentTokenPayload;
    error?: string;
  } {
    if (!token || !token.includes('.')) {
      return { valid: false, error: 'Malformed or missing signed retrieval token' };
    }

    const [payloadBase64, providedSig] = token.split('.');
    const expectedSig = crypto
      .createHmac('sha256', this.getSigningKey())
      .update(payloadBase64)
      .digest('base64url');

    // Timing-safe signature check
    const sigBufferA = Buffer.from(providedSig);
    const sigBufferB = Buffer.from(expectedSig);
    if (sigBufferA.length !== sigBufferB.length || !crypto.timingSafeEqual(sigBufferA, sigBufferB)) {
      return { valid: false, error: 'SECURITY_ERROR: Invalid token signature' };
    }

    try {
      const payload: SignedDocumentTokenPayload = JSON.parse(
        Buffer.from(payloadBase64, 'base64url').toString('utf8')
      );

      const now = Date.now();
      if (now > payload.expiresAt) {
        return { valid: false, error: 'TOKEN_EXPIRED: Signed retrieval URL has expired (15m TTL)' };
      }

      return { valid: true, payload };
    } catch {
      return { valid: false, error: 'Failed to parse token payload' };
    }
  }

  /**
   * Stores a document securely:
   * 1. Encrypts file payload with AES-256-GCM.
   * 2. Persists document record and records audit log.
   * 3. Generates 15-minute signed retrieval URL.
   */
  static async storeDocument(params: {
    travelerProfileId: string;
    type: string; // PASSPORT, NATIONAL_ID, VISA, DRIVER_LICENSE, TICKET_PDF
    documentNumber: string;
    holderName?: string;
    organizationId?: string;
    branchId?: string;
    issuedAt?: string;
    expiresAt?: string;
    issuingCountry?: string;
    fileContent?: Buffer | string;
    contentType?: string;
    operatorId: string;
  }): Promise<StoredDocumentResult> {
    // Encrypt sensitive document number using AES-256-GCM
    const encryptedDocNumber = `enc:v1:${this.encrypt(params.documentNumber).iv}:${this.encrypt(params.documentNumber).authTag}:${Buffer.from(this.encrypt(params.documentNumber).ciphertext, 'base64').toString('hex')}`;

    const doc = await prisma.travelDocument.create({
      data: {
        travelerProfileId: params.travelerProfileId,
        organizationId: params.organizationId,
        branchId: params.branchId,
        type: params.type,
        documentNumber: encryptedDocNumber,
        holderName: params.holderName,
        issuedAt: params.issuedAt,
        expiresAt: params.expiresAt,
        issuingCountry: params.issuingCountry || 'IR',
      },
    });

    // If binary file content is provided, encrypt and store in payload store
    if (params.fileContent) {
      const encryptedFile = this.encrypt(params.fileContent, params.contentType, {
        documentId: doc.id,
        holderName: params.holderName,
        type: params.type,
      });
      this.encryptedPayloadStore.set(doc.id, encryptedFile);
    }

    // Generate signed retrieval URL with 15m TTL
    const { signedUrl, expiresAt } = this.generateSignedRetrievalUrl({
      documentId: doc.id,
      userId: params.operatorId,
      organizationId: params.organizationId,
    });

    // Record audit entry
    await prisma.auditLog.create({
      data: {
        userId: params.operatorId,
        action: 'DOCUMENT_STORED_SECURE',
        resource: `TravelDocument:${params.type}`,
        resourceId: doc.id,
        reason: 'Authorized document upload with AES-256-GCM encryption',
      },
    });

    return {
      documentId: doc.id,
      type: doc.type,
      encrypted: true,
      signedUrl,
      expiresAt,
    };
  }

  /**
   * Retrieves a document securely, verifying either explicit permission or valid signed token.
   */
  static async retrieveDocument(params: {
    documentId: string;
    userId: string;
    token?: string;
    permissions?: string[];
  }): Promise<RetrievedDocumentResult> {
    let authorized = false;

    // Check signed token if provided
    if (params.token) {
      const verification = this.verifySignedRetrievalToken(params.token);
      if (!verification.valid || !verification.payload) {
        throw new Error(verification.error || 'Invalid or expired signed retrieval token');
      }
      if (verification.payload.documentId !== params.documentId) {
        throw new Error('SECURITY_ERROR: Token does not match requested document');
      }
      authorized = true;
    } else {
      // Check explicit permissions
      authorized = hasPiiViewPermission(params.permissions) || (params.permissions?.includes('booking:view:all') ?? false);
    }

    if (!authorized) {
      throw new Error('SECURITY_ERROR: Unauthorized document access. Missing traveler:pii:view or valid signed token.');
    }

    const doc = await prisma.travelDocument.findUnique({
      where: { id: params.documentId },
    });

    if (!doc) {
      throw new Error(`Document ${params.documentId} not found`);
    }

    let fileBuffer: Buffer | undefined;
    let contentType: string | undefined;
    let metadata: Record<string, unknown> | undefined;

    const storedFile = this.encryptedPayloadStore.get(doc.id);
    if (storedFile) {
      fileBuffer = this.decrypt(storedFile);
      contentType = storedFile.contentType;
      metadata = storedFile.metadata;
    }

    // Record audit log for retrieval
    await prisma.auditLog.create({
      data: {
        userId: params.userId,
        action: 'DOCUMENT_RETRIEVED_SECURE',
        resource: `TravelDocument:${doc.type}`,
        resourceId: doc.id,
        reason: 'Authorized document retrieval via signed URL/RBAC',
      },
    });

    return {
      documentId: doc.id,
      type: doc.type,
      documentNumber: doc.documentNumber,
      holderName: doc.holderName,
      contentBuffer: fileBuffer,
      contentType,
      metadata,
    };
  }

  /**
   * Helper for tests or external loaders to prime payload store
   */
  static setPayloadForTesting(documentId: string, payload: EncryptedDocumentPayload) {
    this.encryptedPayloadStore.set(documentId, payload);
  }

  static clearPayloadStore() {
    this.encryptedPayloadStore.clear();
  }
}
