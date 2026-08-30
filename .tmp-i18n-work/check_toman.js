const fs = require('fs');
const path = require('path');
const M = {};
for (const l of ['fa', 'en', 'ar', 'zh', 'ru']) {
  M[l] = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'messages', l + '.json'), 'utf8'));
}
for (const l of ['en', 'zh', 'ru']) {
  console.log(l + ': ' + JSON.stringify({
    'Home.offersToman': M[l].Home && M[l].Home.offersToman,
    'Experiences.toman': M[l].Experiences && M[l].Experiences.toman,
    'Plan.offersToman': M[l].Plan && M[l].Plan.offersToman,
    'Flights.toman': M[l].Flights && M[l].Flights.toman,
    'HotelsSearch.millionToman': M[l].HotelsSearch && M[l].HotelsSearch.millionToman,
    'Interpreter.perDay': M[l].Interpreter && M[l].Interpreter.perDay,
  }));
}
