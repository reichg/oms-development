class Feature {
  id = null;
  type = null;

  osmUrl = null;
  osmServerResponse = null;

  coOrdinates = {
    lat: null,
    lon: null,
  };

  version = null;

  constructor(type, id) {
    try {
      this.id = id;
      this.type = this.getFullType(type);
      this.osmUrl = this.generateOsmUrl(type, id);
      this.osmServerResponse = await getResponseFromOsmServer(osmUrl);
    } catch (e) {
      throw e.message;
    }
  }

  getFullType(type) {
    try {
      const fullType =
        type === "n" || type === "N"
          ? "node"
          : type === "w" || type === "W"
          ? "way"
          : type === "r" || type === "R"
          ? "relation"
          : null;

        if (fullType === null) throw new Error("Invalid type");
        
        return fullType;
      } catch(e) {
        throw new Error("Unsupported feature type")
      }
  }
  

  generateOsmUrl(type, id) {
    try {
      return `https://www.openstreetmap.org/${Feature.getFullType(type)}${id}`;
    } catch (e) {
      throw e.message;
    }
  }

   getResponseFromOsmServer() {
    const baseUrl = `https://api.openstreetmap.org/api/0.6/`
    this.osmServerResponse = await fetch(`${baseUrl}${type}/${id}`);
  }
}

class Node extends Feature {
  constructor(type, id) {
    super(type, id);
  }
}

class Way extends Feature {
  constructor(type, id) {
    super(type, id);
  }
}

class Relation extends Feature {
  members = null;

  constructor(type, id) {
    super(type, id);
  }
}
