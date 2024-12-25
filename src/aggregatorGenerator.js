export class AggregateGenerator {
    constructor(mongoModel, mongoD) {
        this.mongoModel = mongoModel;
        this.mongoD = mongoD;

        this.fksToAggregate = [];
        this.relationsToAggregate = [];
    }

    async _aggregateFks(mongoModel) {
        const entries = [];
    
        for (const [modelName, values] of Object.entries(mongoModel._FKS)) {
            const model = this.mongoD.__models[modelName];
            if (!model) return;

            const collectionName = model.collection.name;

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

    async _aggregateRelations(mongoModel, projects, oldName = "") {
        const entries = [];
        const relations = this.mongoD.__relations[mongoModel.modelName];
    
        for (const [modelName, values] of Object.entries(relations)) {
            const model = this.mongoD.__models[modelName];
            if (!model) return;

            const collectionName = model.collection.name;
            let entry;

            if (values.length === 1) {
                entry = [
                    {
                        $lookup: {
                            from: collectionName,
                            localField: `${oldName}${oldName ? "." : ""}_id`,
                            foreignField: values[0].path.join("."),
                            as: collectionName,
                        }
                    },
                    {
                        $unwind: `$${collectionName}`
                    }
                ];
            } else {
                entry = [
                    {
                        $lookup: {
                            from: collectionName,
                            let: { [`${oldName}_id`]: `${oldName}${oldName ? "." : ""}_id` },
                            pipeline: [
                                {
                                    $match: {
                                        $expr: {
                                            $or: values.map(value => (
                                                { $eq: [ `$${value.path.join(".")}`, `$$${oldName}_id`] }
                                            )),
                                        },
                                    },
                                },
                            ],
                            as: collectionName,
                        }
                    },
                    {
                        $unwind: `$${collectionName}`
                    }
                ];
            }

            projects.add(collectionName);
            entries.push(...entry);

            const modelRelations = this.mongoD.__relations[modelName];
            if (modelRelations) {
                const modelRelationsEntries = await this._aggregateRelations(model, projects, collectionName);
                entries.push(...modelRelationsEntries);
            }
        }

        return entries;
    }

    async _makeFksAggregate() {
        this.fksToAggregate = await this._aggregateFks(this.mongoModel);
    }

    async _makeRelationsAggregate() {
        const projects = new Set([]);

        const relations = await this._aggregateRelations(this.mongoModel, projects);

        const toProjects = {
            $project: Object.fromEntries(
              Array.from(projects).map((pj) => [pj, 0]) // Mapeia os campos para exclusão
            ),
        };

        relations.push(toProjects);

        this.relationsToAggregate = relations;
    }

    async makeAggretions() {
        await this._makeFksAggregate();
        await this._makeRelationsAggregate();
    }
}