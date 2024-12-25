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

    async _makeFksAggregate(options) {
        const stop = false;

        this.fksToAggregate = await this._aggregateFks(this.mongoModel, stop, options);
    }

    async _makeAddField(model, addFields) {
        const newField = {
            [`$${model.modelName}`]: {
                $mergeObjects: [
                    `$${model.collection.name}`
                ],
            }
        }

        addFields.push(newField);
        
        return addFields[addFields.length][[`$${model.modelName}`]]["$mergeObjects"];
    }

    _normalRelation(collectionName, oldName, path) {
        return [
            {
                $lookup: {
                    from: collectionName,
                    localField: `${oldName}${oldName ? "." : ""}_id`,
                    foreignField: path.join("."),
                    as: collectionName,
                }
            },
            {
                $unwind: `$${collectionName}`
            }
        ];
    }

    _multiRelation(collectionName, oldName, values) {
        return [
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
        ]
    }

    async _aggregateRelations(
        mongoModel, 
        projects, 
        stop,
        options,
        addFields,
        oldName = ""
    ) {
        const entries = [];
        const relations = this.mongoD.__relations[mongoModel.modelName];
    
        for (const [modelName, values] of Object.entries(relations)) {
            const model = this.mongoD.__models[modelName];
            if (!model && !stop) break;

            let entry;
            const collectionName = model.collection.name;

            if (options.stop.collection === collectionName) {
                if (options.stop.bruteForce) stop = true;
                break;
            }

            if (values.length === 1) {
                entry = this._normalRelation(
                    collectionName,
                    oldName,
                    values[0].path
                );
            } else {
                entry = this._multiRelation(
                    collectionName,
                    oldName,
                    values
                );
            }

            this._makeAddField(model, addFields);
            projects.add(collectionName);
            entries.push(...entry);

            const modelRelations = this.mongoD.__relations[modelName];
            if (modelRelations) {
                const modelRelationsEntries = await this._aggregateRelations(
                    model, 
                    projects, 
                    stop,
                    options,
                    addFields,
                    collectionName
                );

                entries.push(...modelRelationsEntries);
            }
        }

        return entries;
    }

    async _makeRelationsAggregate(options) {
        const projects = new Set([]);
        const stop = false;
        const addFields = [];

        const relations = await this._aggregateRelations(
            this.mongoModel, 
            projects,
            stop,
            addFields,
            options
        );

        const toProjects = {
            $project: Object.fromEntries(
                Array.from(projects).map((pj) => [pj, 0])
            ),
        };

        const toAddFields = {
            "$addFields": {
                "$relatedTo": addFields,
            }
        }

        relations.push(toProjects);
        relations.push(toAddFields);

        this.relationsToAggregate = relations;
    }

    _getOptions(options = {}) {
        const newOptions = {};
    
        const defaultOptions = {
            stop: {
                collection: ".__.__.__.__.__.__.",
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

    async makeAggregations(direction = "both", options) {
        const tasks = [];
        const newOptions = this._getOptions(options);
    
        if (direction !== "back") tasks.push(this._makeFksAggregate(newOptions));
        if (direction !== "forward") tasks.push(this._makeRelationsAggregate(newOptions));
    
        await Promise.all(tasks);
    }    
}