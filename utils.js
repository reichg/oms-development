const rp = require("request-promise");
const cheerio = require("cheerio");

const request = async (link, id) => {
  const options = {
    uri: link,
    transform: function (body) {
      return cheerio.load(body);
    },
  };

  const requestUrl = (html) => {
    try {
      const htmlString = html.text();

      const conditionToCheckStatusOfRelation =
        htmlString.search(`Toll! Die Relation ist in Ordnung`) !== -1 &&
        htmlString.search(`${id}`) !== -1;

      const error509 = `org.springframework.web.client.HttpServerErrorException: 509 Bandwidth Limit Exceeded`;
      if (htmlString.search(error509) !== -1) return -1;

      if (conditionToCheckStatusOfRelation) return 1;
      else return 0;
    } catch (err) {
      return -1;
    }
  };

  const request = await rp(options);
  const response = await requestUrl(request);

  return response;
};

async function scrapper(id, i) {
  if (id.length <= 0) return;
  const url = `https://ra.osmsurround.org/analyzeRelation?relationId=${id}&noCache=true&_noCache=on`;
  const response = await request(url, id);
  return response;
}

const distance = async (origin, destination) => {
  const R = 6371e3; // metres
  const lat1 = origin.lat;
  const lon1 = origin.lon;
  const lat2 = destination.lat;
  const lon2 = destination.lon;

  const φ1 = (lat1 * Math.PI) / 180; // φ, λ in radians
  const φ2 = (lat2 * Math.PI) / 180;
  const Δφ = ((lat2 - lat1) * Math.PI) / 180;
  const Δλ = ((lon2 - lon1) * Math.PI) / 180;

  const a =
    Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
    Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  const d = R * c; // in metres

  return d.toFixed(2);
};

module.exports = { scrapper, distance };
