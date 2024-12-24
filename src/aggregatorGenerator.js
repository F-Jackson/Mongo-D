class AggregateGenerator {
    constructor(mongoModel, mongoD) {
        this.mongoModel = mongoModel;
        this.mongoD = mongoD;
    }

    async _aggregateFks(mongoModel) {
        const entries = [];
    
        for (const [modelName, values] of Object.entries(mongoModel._FKS)) {
            const model = this.mongoD.__models[modelName];
            if (!model) return;
    
            for (const value of values) {
                const path = value.path.join(".");
                const collectionName = model.collection.name;
    
                const entry = [
                    {
                        $lookup: {
                            from: collectionName,
                            localField: path,
                            foreignField: "_id",
                            as: path
                        }
                    },
                    {
                        $unwind: `$${path}`
                    }
                ];
    
                if (model._FKS) {
                    const populateEntries = await this._aggregateFks(model);
                    if (populateEntries.length > 0) {
                        entry[0]["$lookup"].pipeline = populateEntries;
                    }
                }
    
                entries.push(...entry);
            }
        }
    
        return entries;
    }
}