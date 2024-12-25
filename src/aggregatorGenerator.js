export class AggregateGenerator {
    constructor(mongoModel, mongoD) {
        this.mongoModel = mongoModel;
        this.mongoD = mongoD;

        this.fksToAggregate = [];
        this.relationsToAggregate = [];
    }

    async _aggregateFks(
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

    async _makeAddField(fieldName = "__FKS__") {
        const addField =         {
            $addFields: {
                [fieldName]: {
                    related3: {
                        $mergeObjects: [
                            "$relatedmodel3", // Dados de relatedmodel3
                            { related4: "$relatedmodel4" }, // Anexa relatedmodel4 como related4 dentro de related3
                        ],
                    },
                },
            },
        };

    }

    _getOptions(options = {}) {
        const newOptions = {};
    
        const defaultOptions = {
            stop: {
                collection: "",
                bruteForce: false,
            }
        };
    
        Object.entries(defaultOptions).forEach(([key, defaultValue]) => {
            if (typeof defaultValue === "object" && !Array.isArray(defaultValue)) {
                newOptions[key] = {
                    ...defaultValue,
                    ...(options[key] || {}),
                };
            } else {
                newOptions[key] = options[key] !== undefined ? options[key] : defaultValue;
            }
        });
    
        return newOptions;
    }

    async _makeFksAggregate(options) {
        const stop = false;

        this.fksToAggregate = await this._aggregateFks(this.mongoModel, stop, options);
    }

    async _makeRelationsAggregate(options) {
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

    async makeAggregations(direction = "both", options) {
        const tasks = [];
        const newOptions = this._getOptions(options);
    
        if (direction !== "back") tasks.push(this._makeFksAggregate(newOptions));
        if (direction !== "forward") tasks.push(this._makeRelationsAggregate(newOptions));
    
        await Promise.all(tasks);
    }    
}