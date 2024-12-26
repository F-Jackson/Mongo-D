export class GenerateFoward {
    constructor(options, mongoD, maxDeep = 100) {
        this.options = options;
        this.mongoD = mongoD;
        this.stop = false;
        this.maxDeep = maxDeep;
    }

    async _aggregate(mongoModel, alreadyFound) {
        if (!mongoModel._FKS) return [];

        const entries = [];
        this.maxDeep--;

        if (this.maxDeep < 0) throw new Error("Exceded max deep");
    
        for (const [modelName, values] of Object.entries(mongoModel._FKS)) {
            const model = this.mongoD.__models[modelName];
            if (!model && !this.stop) break;

            const collectionName = model.collection.name;

            if (this.options.stop.collection === collectionName) {
                if (this.options.stop.bruteForce) this.stop = true;
                break;
            }

            if (!alreadyFound) alreadyFound = [];
            if (alreadyFound.includes(modelName)) break;
            alreadyFound.push(modelName);

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
                    const nestedEntries = await this._aggregate(model, alreadyFound);
                    if (nestedEntries.length > 0) {
                        entry[0]["$lookup"].pipeline = nestedEntries;
                    }
                }
    
                entries.push(...entry);
            }
        }
    
        return entries;
    }

    async makeAggregate(mongoModel) {
        return await this._aggregate(mongoModel);
    }
}