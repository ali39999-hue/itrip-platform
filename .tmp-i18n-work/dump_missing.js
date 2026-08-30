const fs = require('fs');
const path = require('path');
const fa = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'messages', 'fa.json'), 'utf8'));
const en = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'messages', 'en.json'), 'utf8'));
const missing = `HotelDetail.backToResults, HotelDetail.capacityError, Flights.nonStop, Flights.filters, Flights.airlines, Flights.flightFound, Flights.noFlights, Flights.clearFilters, Tours.filterCategory, Tours.filterSort, Tours.sortRecommended, Tours.sortPriceLow, Tours.sortDuration, Tours.emptyTours, Tours.days, Tours.startsFrom, Visa.processingTime, Visa.guarantee, Insurance.coverage, Transfers.subtitle, Transfers.airportTransfer, Transfers.search, Transfers.reserve, Trains.filters, Trains.noTickets, Trains.origin, Trains.destination, Trains.searchTickets, Auth.welcome, Auth.phoneLabel, Auth.otpLabel, Auth.verifyOtp, Auth.identityInfo, Auth.passportScan, Auth.googleLogin, Account.editProfile, Account.security, Account.notifications, Account.saveChanges, MyTrips.digitalCard, MyTrips.refund, MyTrips.downloadVoucher, MyTrips.completed, Wallet.balance, Wallet.withdraw, Support.categories, Support.faq, Support.onlineChat, Support.online, Support.typeMessage, Support.send, Snapp.customPackages, Snapp.quickTopup, Snapp.floatWallet, Snapp.simAndSnapp, Snapp.buyPackage, Destinations.popular, Destinations.citiesOf, Destinations.smartPlanner, Destinations.readyTours, Destinations.travelGuide, Book.addons, Services.catalog, Services.specialForDest, Services.exclusivePackage`.split(', ');
for (const k of missing) {
  const get = (o) => k.split('.').reduce((a, x) => (a == null ? a : a[x]), o);
  console.log(k + '\n  fa: ' + JSON.stringify(get(fa)) + '\n  en: ' + JSON.stringify(get(en)));
}
