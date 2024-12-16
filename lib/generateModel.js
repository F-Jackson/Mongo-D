export class ForeignKeyProcessor {
    constructor(mongoModel, mongoD) {
        this.mongoModel = mongoModel;
        this.mongoD = mongoD;
        this.activeForeignKeys = {};
    }

    __mocktest = async (mocks) => {
        if (mocks) {
            Object.entries(mocks).forEach(([method, mockFunc]) => {
                this[method] = mockFunc;
            });
        }
    };

    processForeignKeys = async () => {
        await this._getActiveForeignKeys();
        await this._populateForeignKeyMetadata();
    };

    _getActiveForeignKeys = async () => {
        if (!this.mongoModel.schema["__properties"]) return;

        const schemaPaths = Object.entries(this.mongoModel.schema.__properties);

        await Promise.all(schemaPaths.map(([path, obj]) => this._processPath(path, obj)));
    };

    _processPath = async (path, obj) => {
        if (!obj.type) return;

        const { ref, isArray } = await this._extractFieldTypeAndRef(obj);
        if (!ref) return;

        const metadata = await this._createForeignKeyMetadata(path, obj, isArray);
        await this._addForeignKeyMetadata(ref, metadata);
    };

    _extractFieldTypeAndRef = async (obj) => {
        const isArray = Array.isArray(obj.type);
        const type = isArray ? obj.type[0] : obj.type;

        const linked = !("_linked" in obj && !obj["_linked"]);

        let ref = null; 
        if (type.schemaName === "ObjectId" && linked) {
            if (!obj["ref"]) throw new Error("Cant link without reference");

            ref = obj.ref;
        }

        return { type, ref, isArray };
    };

    _createForeignKeyMetadata = async (path, obj, isArray) => ({
        path: path.split("."),
        required: obj.required || false,
        immutable: obj.immutable || false,
        unique: obj.unique || false,
        array: isArray,
    });

    _addForeignKeyMetadata = async (ref, metadata) => {
        if (!this.activeForeignKeys[ref]) this.activeForeignKeys[ref] = [];
        this.activeForeignKeys[ref].push(metadata);
    };

    _populateForeignKeyMetadata = async () => {
        const activeForeignKeys = Object.entries(this.activeForeignKeys);
        if (activeForeignKeys.length > 0) {
            this.mongoModel._FKS = this.activeForeignKeys;

            const modelName = this.mongoModel.modelName;

            try {
                this.mongoD.addRelations(activeForeignKeys, modelName);

                this.mongoD.saveRelations();
            } catch (err) {
                this.mongoD.resetRelations();

                throw err;
            }
        }
    };
}
