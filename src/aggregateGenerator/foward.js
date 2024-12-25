export class GenerateFoward {
    constructor(options) {
        this.options = options;
        this.stop = false;
    }

    async _aggregate(mongoModel) {
        const entries = [];
    
        for (const [modelName, values] of Object.entries(mongoModel._FKS)) {
            const model = this.mongoD.__models[modelName];
            if (!model && !this.stop) break;

            const collectionName = model.collection.name;

            if (this.options.stop.collection === collectionName) {
                if (this.options.stop.bruteForce) this.stop = true;
                break;
            }

            for (const value of values) {
                const path = value.path.join(".");
    
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
                    const nestedEntries = await this._aggregateFks(model);
                    if (nestedEntries.length > 0) {
                        entry[0]["$lookup"].pipeline = nestedEntries;
                    }
                }
    
                entries.push(...entry);
            }
        }
    
        return entries;
    }

    async makeAggregate() {
        this.fksToAggregate = await this._aggregateFks(this.mongoModel);
    }
}