export class AggregateGenerator {
    constructor(mongoModel, mongoD) {
        this.mongoModel = mongoModel;
        this.mongoD = mongoD;

        this.fksToAggregate = [];
        this.relationsToAggregate = [];
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

    async makeAggregations(direction = "both", options) {
        const tasks = [];
        const newOptions = this._getOptions(options);
    
        if (direction !== "back") tasks.push(this._makeFksAggregate(newOptions));
        if (direction !== "forward") tasks.push(this._makeRelationsAggregate(newOptions));
    
        await Promise.all(tasks);
    }    
}