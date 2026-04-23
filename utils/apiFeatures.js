class APIFeatures {
  constructor(query, queryString) {
    this.query = query;
    this.queryString = queryString;
  }
  filter() {
    // 1)FILTERING
    const queryObj = { ...this.queryString };
    const excludedFields = ["page", "sort", "limit", "fields", "search"]; // Also exclude search
    excludedFields.forEach((el) => delete queryObj[el]);

    // 1B)ADVANCED FILTERING
    let queryStr = JSON.stringify(queryObj);
    queryStr = queryStr.replace(/\b(gte|gt|lte|lt)\b/g, (match) => `$${match}`);

    this.query = this.query.find(JSON.parse(queryStr));
    return this;
  }

  sort() {
    if (this.queryString.sort) {
      const sortBy = this.queryString.sort.split(",").join(" ");
      this.query = this.query.sort(sortBy);
    } else {
      this.query = this.query.sort("-createdAt");
    }
    return this;
  }

  limitFields() {
    if (this.queryString.fields) {
      const fields = this.queryString.fields.split(",").join(" ");
      this.query = this.query.select(fields);
    } else {
      this.query = this.query.select("-__v");
    }
    return this;
  }

  search(fields = ["name", "description"]) {
    if (this.queryString.search) {
      // 28. [NEW] Escape regex characters to prevent ReDoS
      const sanitizedSearch = this.queryString.search.replace(
        /[.*+?^${}()|[\]\\]/g,
        "\\$&"
      );
      const searchRegex = new RegExp(sanitizedSearch, "i");
      this.query = this.query.find({
        $or: fields.map((field) => ({ [field]: searchRegex })),
      });
    }
    return this;
  }

  filterByCategory() {
    if (this.queryString.categories) {
      const categories = this.queryString.categories.split(',');
      this.query = this.query.find({ categories: { $in: categories } });
    }
    return this;
  }

  // 4) PAGINATION
  paginate() {
    const page = this.queryString.page * 1 || 1; // convert the page query to a number, default to 1
    const limit = this.queryString.limit * 1 || 100; // convert the limit query to a number, default to 100
    const skip = (page - 1) * limit; // calculate the number of documents to skip
    this.query = this.query.skip(skip).limit(limit); // apply pagination to the query
    return this;
  }
}

module.exports = APIFeatures;
