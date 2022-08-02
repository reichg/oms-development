const fetch = (...args) =>
  import("node-fetch").then(({ default: fetch }) => fetch(...args));

const { scrapper, distance } = require("./utils");

class OutputGenerator {
  static inputIssues = null;
  static links = null;
  static outputText = [];
  static config = {
    countryName: false,
  };

  static async initiateProcessing(input) {
    const [flags, ...issues] = input.split(",");
    OutputGenerator.configureFlags(flags);
    OutputGenerator.inputIssues = issues;
    OutputGenerator.links = OutputGenerator.generateLinks();
    OutputGenerator.outputText = [];

    if (OutputGenerator.links.length === 1) {
      await OutputGenerator.generateOutputText(OutputGenerator.links);
    } else {
      const totalength = OutputGenerator.links.length;
      let currentLinks = [];
      const SPLIT = 3;
      let i = 0;
      while (i <= totalength) {
        const startIndex = i;
        const endIndex = i + SPLIT > totalength ? totalength : i + SPLIT;
        if (startIndex === endIndex) break;
        currentLinks = OutputGenerator.links.slice(startIndex, endIndex);
        console.log(`Started processing from ${startIndex} to ${endIndex}`);
        await OutputGenerator.generateOutputText(currentLinks);
        console.log(`Done processing from ${startIndex} to ${endIndex}`);
        i = i + SPLIT > totalength ? totalength : i + SPLIT;
      }
    }

    console.log(`Done Processing at ${new Date(Date.now())}`);
    OutputGenerator.resetState();
  }

  static configureFlags(inputFlags) {
    const flags = inputFlags.split("");
    flags.forEach((flag) => {
      if (flag === "c") OutputGenerator.config.countryName = true;
    });
  }

  static resetState() {
    OutputGenerator.inputIssues = null;
    OutputGenerator.links = null;
    OutputGenerator.config = {
      countryName: false,
    };
  }

  static generateLinks() {
    return OutputGenerator.inputIssues.map((item) =>
      OutputGenerator.generateURLFromFeatureId(item)
    );
  }

  static generateURLFromFeatureId(id) {
    const baseUrl = "https://www.openstreetmap.org/";
    return `${baseUrl}${OutputGenerator.expandFeatureTypeAndId(id)}`;
  }

  static expandFeatureTypeAndId(id) {
    if (id[0] === "n") return `node/${id.slice(1)}`;
    if (id[0] === "w") return `way/${id.slice(1)}`;
    if (id[0] === "r") return `relation/${id.slice(1)}`;
    return null;
  }

  static async generateOutputText(currentLinks) {
    try {
      const data = await Promise.all(
        currentLinks.map((item) => OutputGenerator.processOutput(item))
      );

      OutputGenerator.outputText.push(...data);
    } catch (e) {
      throw new Error("Unable to process features");
    }
  }

  static async processOutput(url) {
    const [_, unique] = url.split("https://www.openstreetmap.org/");
    const [type, id] = unique.split("/");
    const apiUrl = `https://api.openstreetmap.org/api/0.6/${type}/${+id}.json`;

    try {
      const response = await fetch(apiUrl);
      if (response.status === 410) return "Feature is deleted";
      const data = await response.json();
      const output = data.elements[0];
      return await OutputGenerator.generateOutputFinalText(output);
    } catch (e) {
      throw new Error("Failed to fetch");
    }
  }

  static async generateOutputFinalText(output) {
    if (output.version === 1) return await OutputGenerator.forVersion1(output);
    return await OutputGenerator.forVersionGreaterThan1(output);
  }

  static async getCountry(obj) {
    if (!OutputGenerator.config.countryName) return "";

    if (obj.lat === -1 && obj.lon === -1) {
      return ` Failed to get country name,`;
    }

    const url = `https://nominatim.openstreetmap.org/reverse?lat=${obj.lat}&lon=${obj.lon}&format=json&addressdetails=1`;
    const response = await fetch(url);
    if (response.status !== 200) return ` Unable to read country name,`;
    const data = [await response.json()];
    if (data.length > 0) return ` ${data[0].address.country},`;
    return ` Failed to get country name,`;
  }

  static async getCoordinates(members) {
    let node = members.filter((item) => item.split("/")[0] === "node");

    if (node.length > 0) {
      node = node[0];
    } else {
      let way = members.filter((item) => item.split("/")[0] === "way");
      way = way[0];
      const url = `https://api.openstreetmap.org/api/0.6/${way}.json`;
      const response = await fetch(url);
      if (response.status !== 200) return { lat: -1, lon: -1 };
      const data = await response.json();
      node = `node/${data.elements[0].nodes[0]}`;
    }

    const url = `https://api.openstreetmap.org/api/0.6/${node}.json`;
    const response = await fetch(url);
    if (response.status !== 200) return { lat: -1, lon: -1 };
    const data = await response.json();
    return { lat: data.elements[0].lat, lon: data.elements[0].lon };
  }

  static async forVersion1(output) {
    // For node and way
    if (output.type === "node") {
      let country = "";
      if (OutputGenerator.config.countryName) {
        country = await OutputGenerator.getCountry({
          lat: output.lat,
          lon: output.lon,
        });
      }
      return `${output.type}/${output.id},${country} is of v1`;
    }

    if (output.type === "way") {
      let country = "";
      if (OutputGenerator.config.countryName) {
        const coordinates = await OutputGenerator.getCoordinates([
          `node/${output.nodes[0]}`,
        ]);
        country = await OutputGenerator.getCountry(coordinates);
      }
      return `${output.type}/${output.id},${country} is of v1`;
    }

    // For relation
    if (output.type === "relation") {
      let country = "";
      if (OutputGenerator.config.countryName) {
        const members = output.members.map(
          (item) => `${item.type}/${item.ref}`
        );
        const coordinates = await OutputGenerator.getCoordinates(members);
        country = await OutputGenerator.getCountry(coordinates);
      }

      if (output.tags.type === "multipolygon") {
        return `${output.type}/${output.id},${country} is of v${output.version} and is of type multipolygon`;
      }

      const scrapperOutput = await scrapper(+output.id);

      if (scrapperOutput === 1) {
        return `${output.type}/${output.id},${country} is of v${output.version} and the status is good`;
      }

      if (scrapperOutput === 0) {
        return `${output.type}/${output.id},${country} is of v${output.version} and the status is bad`;
      }

      return `${output.type}/${output.id},${country} Relation analyzer failed to respond`;
    }
  }

  static async checkTagChanges(prevTags, newTags) {
    const prevTagsKeys = Object.keys(prevTags);
    const newTagsKeys = Object.keys(newTags);

    // No tag changes condition
    if (prevTags.length === newTags.length) {
      const prevTagsString = prevTagsKeys
        .sort()
        .map((item) => `${item}: ${prevTags[item]}`)
        .join(" ");

      const newTagsString = newTagsKeys
        .sort()
        .map((item) => `${item}: ${newTags[item]}`)
        .join(" ");

      if (prevTagsString === newTagsString) {
        return `no [name/place] tag changes`;
      }
    }

    const finalString = [];

    if (prevTags.hasOwnProperty("name") && newTags.hasOwnProperty("name")) {
      if (prevTags.name !== newTags.name) {
        finalString.push(
          `name is changed from [${prevTags.name} -> ${newTags.name}]`
        );
      }
    }

    if (prevTags.hasOwnProperty("place") && newTags.hasOwnProperty("place")) {
      if (prevTags.place !== newTags.place) {
        finalString.push(
          `place is changed from [${prevTags.place} -> ${newTags.place}]`
        );
      }
    }

    if (prevTags.hasOwnProperty("name") && !newTags.hasOwnProperty("name")) {
      finalString.push(`name tag with value [${prevTags.name}] is removed`);
    }

    if (!prevTags.hasOwnProperty("name") && newTags.hasOwnProperty("name")) {
      finalString.push(`name tag with value [${newTags.name}] is added`);
    }

    if (prevTags.hasOwnProperty("place") && !newTags.hasOwnProperty("place")) {
      finalString.push(`place tag with value [${prevTags.place}] is removed`);
    }

    if (!prevTags.hasOwnProperty("place") && newTags.hasOwnProperty("place")) {
      finalString.push(`place tag with value [${newTags.place}] is added`);
    }

    if (finalString.join(", ").length === 0) {
      return `tags otherthan [name/place] are changed`;
    }

    return finalString.join(", ");
  }

  static async checkDuplicates(input) {
    const preCondition =
      input.type !== "node" ||
      !input.hasOwnProperty("tags") ||
      !input.tags.hasOwnProperty("name");

    if (preCondition) return `, doesn't have name tag to check for duplicates`;

    const { lat, lon: lng } = input;
    const name = input.tags.name;

    const change = 0.01; // `0.01` is equal to `1km`
    const range = change * 100;

    const boundingBox = {
      southLat: +lat - +change,
      westLng: +lng - +change,
      northLat: +lat + +change,
      eastLng: +lng + +change,
    };

    const { southLat, westLng, northLat, eastLng } = boundingBox;

    const servers = {
      main: `https://www.overpass-api.de/api/interpreter`,
      kumi: `https://overpass.kumi.systems/api/interpreter`,
    };

    const { kumi } = servers;

    const filters = `[name][place]`;
    const bbox = `nwr(${southLat},${westLng},${northLat},${eastLng})${filters};`;
    const url = `${kumi}?data=[out:json][timeout:50000];${bbox}out%20meta;`;

    try {
      const request = await fetch(url);

      const data = await request.json();
      const { elements } = data;

      const duplicates = [];

      elements.forEach((item) => {
        if (
          item.type === "node" &&
          item.hasOwnProperty("tags") &&
          (item.tags.hasOwnProperty("place") ||
            item.tags.hasOwnProperty("boundary") ||
            item.tags.hasOwnProperty("admin_level")) &&
          item.tags.hasOwnProperty("name") &&
          item.tags.name === name
        )
          duplicates.push(item.tags.name);
      });

      if (duplicates.length === 0) {
        return ", invalid place name to check for duplicates";
      }

      if (duplicates.length === 1) {
        return `, no duplicates with in ${range}km range`;
      }

      const duplicatesCount = duplicates.length - 1;
      return `, have ${duplicatesCount} duplicate${
        duplicatesCount > 1 ? "s" : ""
      } within ${range}km range`;
    } catch (e) {
      console.log(`Failed to check duplicates for ${input.type}/${input.id}`);
      return `, server error while checking duplicates`;
    }
  }

  static async forVersionGreaterThan1(output) {
    // For relation
    if (output.type === "relation") {
      let country = "";

      if (OutputGenerator.config.countryName) {
        const members = output.members.map(
          (item) => `${item.type}/${item.ref}`
        );
        const coordinates = await OutputGenerator.getCoordinates(members);
        country = await OutputGenerator.getCountry(coordinates);
      }

      const url = `https://api.openstreetmap.org/api/0.6/${
        output.type
      }/${+output.id}/history.json`;

      const history = await fetch(url);
      const response = await history.json();

      const previousVersion = response.elements[response.elements.length - 2];
      const latestVersion = response.elements[response.elements.length - 1];

      let [membersChanged, tagsChanged] = [false, false];

      // Check for members changes
      if (previousVersion.members.length === latestVersion.members.length) {
        const prevMembers = previousVersion.members;
        const latestMembers = latestVersion.members;

        const lengthToCheck = prevMembers.length;

        for (let i = 0; i < lengthToCheck; i++) {
          if (
            prevMembers[i].type !== latestMembers[i].type ||
            prevMembers[i].ref !== latestMembers[i].ref ||
            prevMembers[i].role !== latestMembers[i].role
          ) {
            membersChanged = true;
            break;
          }
        }
      } else {
        membersChanged = true;
      }

      // Check for tag changes
      if (
        previousVersion.tags === undefined ||
        latestVersion.tags === undefined
      ) {
        tagsChanged = true;
      } else if (previousVersion.tags.length === latestVersion.tags.length) {
        const prevKeys = Object.keys(previousVersion.tags).sort();
        const prevValues = Object.values(previousVersion.tags).sort();
        const latestKeys = Object.keys(latestVersion.tags).sort();
        const latestValues = Object.values(latestVersion.tags).sort();

        const lengthToCheck = prevKeys.length;

        for (let i = 0; i < lengthToCheck; i++) {
          if (
            prevKeys[i] !== latestKeys[i] ||
            prevValues[i] !== latestValues[i]
          ) {
            tagsChanged = true;
            break;
          }
        }
      } else {
        tagsChanged = true;
      }

      let tagAndMemberChanges = ``;

      if (membersChanged && tagsChanged) {
        tagAndMemberChanges = "both tags & members are changed";
      } else if (membersChanged) {
        tagAndMemberChanges = "only members changed";
      } else if (tagsChanged) {
        tagAndMemberChanges = "only tags changed";
      } else {
        tagAndMemberChanges = "error checking tags & members changes";
      }

      if (output.tags.type === "multipolygon") {
        return `${output.type}/${output.id},${country} is of v${output.version}, ${tagAndMemberChanges}, type is multipolygon`;
      }

      const scrapperOutput = await Promise.race([
        scrapper(+output.id),
        new Promise((resolve) => setTimeout(() => resolve(-1), 1000 * 30)),
      ]);

      if (scrapperOutput === 1) {
        return `${output.type}/${output.id},${country} is of v${output.version}, ${tagAndMemberChanges}, status is good`;
      }

      if (scrapperOutput === 0) {
        return `${output.type}/${output.id},${country} is of v${output.version}, ${tagAndMemberChanges}, status is bad`;
      }

      return `${output.type}/${output.id},${country} Relation analyzer failed to respond`;
    }

    // for node
    if (output.type === "node") {
      let country = "";
      if (OutputGenerator.config.countryName) {
        country = await OutputGenerator.getCountry({
          lat: output.lat,
          lon: output.lon,
        });
      }

      const url = `https://api.openstreetmap.org/api/0.6/${
        output.type
      }/${+output.id}/history.json`;

      const history = await fetch(url);
      const response = await history.json();

      const itemsArr = response.elements;

      const previousVersion = itemsArr[itemsArr.length - 2];
      const latestVersion = itemsArr[itemsArr.length - 1];

      const origin = {
        lat: previousVersion.lat ? previousVersion.lat : latestVersion.lat,
        lon: previousVersion.lon ? previousVersion.lon : latestVersion.lon,
      };

      const destination = {
        lat: latestVersion.lat ? latestVersion.lat : previousVersion.lat,
        lon: latestVersion.lon ? latestVersion.lon : previousVersion.lon,
      };

      const distanceCalc = await distance(origin, destination);

      const tagsChanged = await OutputGenerator.checkTagChanges(
        previousVersion.tags ? previousVersion.tags : latestVersion.tags,
        latestVersion.tags ? latestVersion.tags : previousVersion.tags
      );

      const duplicateStatus = await OutputGenerator.checkDuplicates(output);

      const placeType = `${
        latestVersion.tags.place ? latestVersion.tags.place : "NO-NAME"
      }`;

      if (distanceCalc <= 0 && tagsChanged !== null && duplicateStatus !== "") {
        return `${output.type}/${output.id},${country} is of v${itemsArr.length} and ${tagsChanged}${duplicateStatus}`;
      }

      if (
        distanceCalc <= 100 &&
        tagsChanged !== null &&
        duplicateStatus !== ""
      ) {
        return `${output.type}/${output.id},${country} is of v${itemsArr.length}, [place: ${placeType}] is moved for ${distanceCalc}m (within Threshold) and ${tagsChanged}${duplicateStatus}`;
      }

      if (
        distanceCalc > 100 &&
        tagsChanged !== null &&
        duplicateStatus !== ""
      ) {
        return `${output.type}/${output.id},${country}, is of v${itemsArr.length}, [place: ${placeType}] moved for ${distanceCalc}m and ${tagsChanged}${duplicateStatus}`;
      }

      return `${output.type}/${output.id},${country} is of v${itemsArr.length}, need to investigate`;
    }

    // For way
    if (output.type === "way") {
      let country = "";
      if (OutputGenerator.config.countryName) {
        const coordinates = await OutputGenerator.getCoordinates([
          `node/${output.nodes[0]}`,
        ]);
        country = await OutputGenerator.getCountry(coordinates);
      }

      const url = `https://api.openstreetmap.org/api/0.6/${
        output.type
      }/${+output.id}/history.json`;

      const history = await fetch(url);
      const response = await history.json();
      const previousVersion = response.elements[response.elements.length - 2];
      const latestVersion = response.elements[response.elements.length - 1];

      let [nodesChanged, tagsChanged] = [false, false];

      // Check for geometry changes
      if (previousVersion.nodes.length === latestVersion.nodes.length) {
        const prevNodes = previousVersion.nodes.sort();
        const latestNodes = latestVersion.nodes.sort();

        const lengthToCheck = prevNodes.length;

        for (let i = 0; i < lengthToCheck; i++) {
          if (prevNodes[i] !== latestNodes[i]) {
            nodesChanged = true;
            break;
          }
        }
      } else {
        nodesChanged = true;
      }

      // Check for tag changes
      if (
        previousVersion.tags !== undefined &&
        latestVersion.tags !== undefined &&
        previousVersion.tags.length === latestVersion.tags.length
      ) {
        const prevKeys = Object.keys(previousVersion.tags).sort();
        const prevValues = Object.values(previousVersion.tags).sort();
        const latestKeys = Object.keys(latestVersion.tags).sort();
        const latestValues = Object.values(latestVersion.tags).sort();

        const lengthToCheck = prevKeys.length;

        for (let i = 0; i < lengthToCheck; i++) {
          if (
            prevKeys[i] !== latestKeys[i] ||
            prevValues[i] !== latestValues[i]
          ) {
            tagsChanged = true;
            break;
          }
        }
      } else {
        tagsChanged = true;
      }

      if (nodesChanged && tagsChanged) {
        return `${output.type}/${output.id},${country} is of v${output.version}, both tags & geometry are changed`;
      }

      if (tagsChanged) {
        return `${output.type}/${output.id},${country} is of v${output.version}, only tags changed`;
      }

      if (nodesChanged) {
        return `${output.type}/${output.id},${country} is of v${output.version}, only geometry changed`;
      }

      return `${output.type}/${output.id},${country} is of v${output.version} need to investigate`;
    }
  }
}

module.exports = OutputGenerator;
