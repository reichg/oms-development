class OutputGenerator {
  static inputIssues = null;
  static links = null;
  static outputText = null;

  static initiateProcessing(input) {
    OutputGenerator.inputIssues = input.split(",");

    OutputGenerator.links = OutputGenerator.inputIssues.map((item) =>
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

  static checkVersion() {}
}

module.exports = OutputGenerator;
