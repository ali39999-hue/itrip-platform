-- Performance indexes for the most frequent booking, inventory, refund and OTP lookups.
CREATE INDEX "BookingItem_bookingId_idx" ON "BookingItem"("bookingId");
CREATE INDEX "BookingItem_inventoryItemId_idx" ON "BookingItem"("inventoryItemId");
CREATE INDEX "RefundItem_bookingItemId_idx" ON "RefundItem"("bookingItemId");
CREATE INDEX "InventoryItem_supplierId_idx" ON "InventoryItem"("supplierId");
CREATE INDEX "OtpVerification_identifier_consumedAt_expiresAt_createdAt_idx"
  ON "OtpVerification"("identifier", "consumedAt", "expiresAt", "createdAt");
