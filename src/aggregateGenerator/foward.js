export class GenerateFoward {
    constructor(options, mongoD, maxDeep = 100) {
        this.options = options;
        this.mongoD = mongoD;
        this.stop = false;
        this.maxDeep = maxDeep;
    }

    _shouldSkipModel(relatedModelName, alreadyVisited) {
        const relatedModel = this.mongoD.__models[relatedModelName];
        if (!relatedModel || alreadyVisited.includes(relatedModelName)) return true;

        const collectionName = relatedModel.collection.name;
        if (this.options.stop.collection === collectionName) {
            if (this.options.stop.bruteForce) this.stop = true;
            return true;
        }

        return this.stop;
    }

    _createLookupStage(collectionName, path) {
        return {
            $lookup: {
                from: collectionName,
                localField: path,
                foreignField: "_id",
                as: path
            }
        };
    }

    _createUnwindStage(path) {
        return {
            $unwind: `$${path}`
        };
    }

    async _aggregate(mongoModel, alreadyVisited) {
        if (!mongoModel._FKS) return [];

        const pipeline = [];
        this.maxDeep--;

        if (this.maxDeep < 0) throw new Error("Exceded max deep");

        for (const [relatedModelName, keys] of Object.entries(mongoModel._FKS)) {
            if (this._shouldSkipModel(relatedModelName, alreadyVisited)) continue;

            const relatedModel = this.mongoD.__models[relatedModelName];
            const collectionName = relatedModel.collection.name;

            if (this.options.stop.collection === collectionName) {
                if (this.options.stop.bruteForce) this.stop = true;
                break;
            }

            for (const key of keys) {
                const path = key.path.join(".");

                const lookupStage = this._createLookupStage(collectionName, path);
                const unwindStage = this._createUnwindStage(path);
    
                if (mongoModel._FKS) {
                    const nestedPipeline = await this._aggregate(
                        relatedModel,
                        [...alreadyVisited, relatedModelName]
                    );
                    if (nestedPipeline.length > 0) {
                        lookupStage.$lookup.pipeline = nestedPipeline;
                    }
                }
    
                pipeline.push(lookupStage, unwindStage);
            }
        }
    
        return pipeline;
    }

    async makeAggregate(mongoModel) {
        const alreadyVisited = [];

        return await this._aggregate(mongoModel, alreadyVisited);
    }
}