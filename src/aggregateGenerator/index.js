export class AggregateGenerator {
    constructor(mongoModel, options, mongoD) {
        this.mongoModel = mongoModel;
        this.mongoD = mongoD;
        this.options = this._getOptions(options);
    }

    _getOptions(options) {
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

    async makeAggregations(direction = "both") {
        const tasks = [];
    
        if (direction !== "back") tasks.push(this._makeFksAggregate(this.options));
        if (direction !== "forward") tasks.push(this._makeRelationsAggregate(this.options));
    
        await Promise.all(tasks);
    }    
}