export class GenerateFoward {
    async _aggregate(
        mongoModel, 
        stop,
        options
    ) {
        const entries = [];
    
        for (const [modelName, values] of Object.entries(mongoModel._FKS)) {
            const model = this.mongoD.__models[modelName];
            if (!model && !stop) break;

            const collectionName = model.collection.name;

            if (options.stop.collection === collectionName) {
                if (options.stop.bruteForce) stop = true;
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
                    const nestedEntries = await this._aggregateFks(model, stop, options);
                    if (nestedEntries.length > 0) {
                        entry[0]["$lookup"].pipeline = nestedEntries;
                    }
                }
    
                entries.push(...entry);
            }
        }
    
        return entries;
    }

    async makeAggregate(options) {
        const stop = false;

        this.fksToAggregate = await this._aggregateFks(this.mongoModel, stop, options);
    }
}