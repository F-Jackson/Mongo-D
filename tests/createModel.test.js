import { describe, it, beforeEach, expect } from "vitest";
import mongoose from "mongoose";
import { deleteFromMongoose } from "../utils.js";
import { cleanDb, disconnectDb } from "./utils.js";
import { InitModels, Schema } from "../src/index.js";

/***************************DROP COLLECTION IS NOT WORKING**************************************/

describe("Mongo model creation", () => {
    let testSchema;
    let relatedSchema;
    let client;

    beforeEach(async () => {
        client = await cleanDb();
        await InitModels(client);

        relatedSchema = new Schema({
            title: { type: String, required: true },
        });
        testSchema = new Schema({
            name: { type: String, required: true },
            related: {
                type: mongoD.Schema.Types.ObjectId,
                ref: "RelatedModel",
                required: true,
            },
        });
    });

    afterEach(async () => {
        await disconnectDb();
    });

    it("should create a model and process foreign keys", async () => {
        const RelatedModel = await mongoose.model("RelatedModel", relatedSchema);
        const TestModel = await mongoose.model("TestModel", testSchema);

        expect(mongoD.models).toHaveProperty("TestModel");
        expect(mongoD.models).toHaveProperty("RelatedModel");

        expect(Object.entries(TestModel._FKS)).toHaveLength(1);
        expect(TestModel._FKS).toMatchObject({
            "RelatedModel": [
                {
                    path: ["related"],
                    required: true,
                    immutable: false,
                    unique: false,
                    array: false,
                }
            ]
        });
    });

    it("should throw error if model with same name exists", async () => {
        const TestModel = await mongoose.model("TestModel", testSchema);

        await expect(() => mongoose.model("TestModel", relatedSchema)).rejects.toThrow(
            "Model already exists"
        );

        expect(Object.entries(mongoD.models)).toHaveLength(1);
        expect(mongoD.models).toHaveProperty("TestModel");

        expect(Object.entries(TestModel._FKS)).toHaveLength(1);
        expect(TestModel._FKS).toMatchObject({
            "RelatedModel": [
                {
                    path: ["related"],
                    required: true,
                    immutable: false,
                    unique: false,
                    array: false,
                }
            ]
        });
    });

    it("should handle models with no foreign keys", async () => {
        const simpleSchema = new Schema({
            simpleField: { type: String, required: true },
        });

        const SimpleModel = await mongoose.model("SimpleModel", simpleSchema);

        expect(Object.entries(mongoD.models)).toHaveLength(1);
        expect(mongoD.models).toHaveProperty("SimpleModel");

        expect(SimpleModel).not.toHaveProperty("_FKS");
    });

    it("should support multiple foreign keys in a single model", async () => {
        const multiFKSchema = new Schema({
            name: { type: String, required: true },
            related1: {
                type: mongoD.Schema.Types.ObjectId,
                ref: "RelatedModel",
                required: true,
            },
            related2: {
                type: mongoD.Schema.Types.ObjectId,
                ref: "RelatedModel",
                required: false,
            },
        });

        const MultiFKModel = await mongoose.model("MultiFKModel", multiFKSchema);

        expect(Object.entries(MultiFKModel._FKS)).toHaveLength(1);
        expect(MultiFKModel._FKS).toMatchObject({
            "RelatedModel": [
                {
                    path: ["related1"],
                    required: true,
                    immutable: false,
                    unique: false,
                    array: false,
                },
                {
                    path: ["related2"],
                    required: false,
                    immutable: false,
                    unique: false,
                    array: false,
                },
            ]
        });
    });

    it("should handle deletion of foreign key metadata when model is removed", async () => {
        const TestModel = await mongoose.model("TestModel", relatedSchema);
        await TestModel.create({title: "test"});
        await TestModel.dropCollection();

        expect(Object.entries(mongoD.models)).toHaveLength(0);
        let db = client.connection.db;
        let collections = await db.listCollections().toArray();
        expect(collections).toHaveLength(0);
    });

    it("should process paths in schema", async () => {
        const nestedSchema = new Schema({
            nestedField: {
                subField: {
                    type: mongoD.Schema.Types.ObjectId,
                    ref: "RelatedModel",
                    required: true,
                    unique: true,
                    immutable: true
                },
                po: String,
                ll: {
                    io: String,
                    h: String
                }
            },
            nestedField2: {
                po2: {
                    subField: {
                        type: [mongoD.Schema.Types.ObjectId],
                        ref: "RelatedModel",
                    },
                    arrayTest: [{ type: mongoD.Schema.Types.ObjectId, ref: "RelatedModel", required: true }]
                }
            },
            lo: [String]
        });
        const NestedModel = await mongoose.model("NestedModel", nestedSchema);

        expect(nestedSchema).toHaveProperty("__properties");
        const propertiesKeys = Object.entries(nestedSchema.__properties).map(([key, _]) => key);
        expect(propertiesKeys).toMatchObject(
            [
                "nestedField.subField",
                "nestedField.po",
                "nestedField.ll.io",
                "nestedField.ll.h",
                "nestedField2.po2.subField",
                "nestedField2.po2.arrayTest",
                "lo",
                "_id",
                "__v"
            ]
        );

        expect(NestedModel.schema).toHaveProperty("__properties");
        const modelPropertiesKeys = Object.entries(NestedModel.schema.__properties).map(([key, _]) => key);
        expect(modelPropertiesKeys).toMatchObject(
            [
                "nestedField.subField",
                "nestedField.po",
                "nestedField.ll.io",
                "nestedField.ll.h",
                "nestedField2.po2.subField",
                "nestedField2.po2.arrayTest",
                "lo",
                "_id",
                "__v"
            ]
        );
    });

    it("should isolate process paths in schema", async () => {
        const concurrentSchemaCreations = Promise.all([
            new Schema({
                nestedField: {
                    subField: {
                        type: mongoD.Schema.Types.ObjectId,
                        ref: "RelatedModel",
                        required: true,
                        unique: true,
                        immutable: true,
                    },
                    po: String,
                    ll: {
                        io: String,
                        h: String,
                    },
                },
                nestedField2: {
                    po2: {
                        subField: {
                            type: [mongoD.Schema.Types.ObjectId],
                            ref: "RelatedModel",
                        },
                        arrayTest: [
                            { type: mongoD.Schema.Types.ObjectId, ref: "RelatedModel", required: true },
                        ],
                    },
                },
                lo: [String],
            }),
            new Schema({
                isolated: [String],
            }),
        ]);
    
        const [nestedSchema, nestedSchema2] = await concurrentSchemaCreations;

        expect(nestedSchema).toHaveProperty("__properties");
        const propertiesKeys = Object.entries(nestedSchema.__properties).map(([key, _]) => key);
        expect(propertiesKeys).toHaveLength(8);
        expect(propertiesKeys).toMatchObject(
            [
                "nestedField.subField",
                "nestedField.po",
                "nestedField.ll.io",
                "nestedField.ll.h",
                "nestedField2.po2.subField",
                "nestedField2.po2.arrayTest",
                "lo",
                "_id",
            ]
        );

        expect(nestedSchema2).toHaveProperty("__properties");
        const propertiesKeys2 = Object.entries(nestedSchema2.__properties).map(([key, _]) => key);
        expect(propertiesKeys2).toHaveLength(2);
        expect(propertiesKeys2).toMatchObject(
            [
                "isolated",
                "_id",
            ]
        );
    });

    it("should process deeply nested foreign keys", async () => {
        const nestedSchema = new Schema({
            nestedField: {
                subField: {
                    type: mongoD.Schema.Types.ObjectId,
                    ref: "RelatedModel",
                    required: true,
                    unique: true,
                    immutable: true
                },
                po: String,
                ll: {
                    io: String,
                    h: String
                }
            },
            nestedField2: {
                po2: {
                    subField: {
                        type: [mongoD.Schema.Types.ObjectId],
                        ref: "RelatedModel",
                    },
                    arrayTest: [{ type: mongoD.Schema.Types.ObjectId, ref: "RelatedModel", required: true }]
                }
            },
            lo: [String]
        });
        const NestedModel = await mongoose.model("NestedModel", nestedSchema);

        expect(Object.entries(mongoD.models)).toHaveLength(1);
        expect(mongoD.models).toHaveProperty("NestedModel");
        expect(Object.entries(mongoD.relations)).toHaveLength(1);
        expect(Object.entries(mongoD.relations["RelatedModel"])).toHaveLength(1);
        expect(Object.keys(mongoD.relations["RelatedModel"])).toMatchObject(["NestedModel"]);

        expect(Object.entries(NestedModel._FKS)).toHaveLength(1);
        expect(Object.entries(NestedModel._FKS["RelatedModel"])).toHaveLength(2);
        expect(NestedModel._FKS).toMatchObject({
            "RelatedModel": [
                {
                    path: ["nestedField", "subField"],
                    required: true,
                    immutable: true,
                    unique: true,
                    array: false,
                },
                {
                    path: ["nestedField2" , "po2", "subField"],
                    required: false,
                    immutable: false,
                    unique: false,
                    array: true,
                },
            ]
        });
    });

    it("should handle optional foreign keys", async () => {
        const optionalSchema = new Schema({
            optionalField: {
                type: mongoD.Schema.Types.ObjectId,
                ref: "RelatedModel",
                _linked: false,
                required: false,
            },
        });

        const OptionalModel = await mongoose.model("OptionalModel", optionalSchema);

        expect(Object.entries(mongoD.models)).toHaveLength(1);
        expect(mongoD.models).toHaveProperty("OptionalModel");

        expect(OptionalModel).not.toHaveProperty("_FKS");
    });

    it("should process foreign keys when multiple models reference the same model", async () => {
        const anotherTestSchema = new Schema({
            anotherName: { type: String, required: true },
            related: {
                type: mongoD.Schema.Types.ObjectId,
                ref: "RelatedModel",
                required: true,
            },
        });

        const RelatedModel = await mongoose.model("RelatedModel", relatedSchema);
        const TestModel = await mongoose.model("TestModel", testSchema);
        const AnotherTestModel = await mongoose.model("AnotherTestModel", anotherTestSchema);

        expect(Object.entries(mongoD.models)).toHaveLength(3);
        expect(Object.entries(mongoD.relations)).toHaveLength(1);
        expect(Object.keys(mongoD.relations["RelatedModel"])).toMatchObject(["TestModel", "AnotherTestModel"]);
        expect(TestModel).toHaveProperty("_FKS");
        expect(AnotherTestModel).toHaveProperty("_FKS");
    });

    it("should correctly delete a foreign key model and not affect other models", async () => {
        const RelatedModel = await mongoose.model("RelatedModel", relatedSchema);
        const TestModel = await mongoose.model("TestModel", testSchema);
        const AnotherTestModel = await mongoose.model("AnotherTestModell", testSchema);

        expect(Object.entries(mongoD.models)).toHaveLength(3);
        expect(Object.entries(mongoD.relations)).toHaveLength(1);
        expect(Object.keys(mongoD.relations["RelatedModel"])).toMatchObject(["TestModel", "AnotherTestModell"]);
        expect(Object.keys(TestModel._FKS)).toHaveLength(1);
        expect(Object.keys(AnotherTestModel._FKS)).toHaveLength(1);

        await RelatedModel.dropCollection();

        expect(Object.entries(mongoD.models)).toHaveLength(2);
        expect(Object.keys(TestModel._FKS)).toHaveLength(0);
        expect(Object.keys(AnotherTestModel._FKS)).toHaveLength(0);

        expect(Object.entries(mongoD.relations)).toHaveLength(0);
    });

    it("should handle circular references", async () => {
        const circularSchemaA = new Schema({
            name: { type: String, required: true },
            related: {
                type: mongoD.Schema.Types.ObjectId,
                ref: "ModelB",
                required: true,
            },
        });
    
        const circularSchemaB = new Schema({
            name: { type: String, required: true },
            related: {
                type: mongoD.Schema.Types.ObjectId,
                ref: "ModelA",
                required: true,
            },
        });
    
        const ModelA = await mongoose.model("ModelA", circularSchemaA);
        const ModelB = await mongoose.model("ModelB", circularSchemaB);
    
        expect(Object.entries(mongoD.models)).toHaveLength(2);
        expect(Object.entries(mongoD.relations)).toHaveLength(2);

        expect(Object.keys(mongoD.relations["ModelA"])).toMatchObject(["ModelB"]);
        expect(Object.keys(mongoD.relations["ModelB"])).toMatchObject(["ModelA"]);

        expect(Object.entries(ModelA._FKS)).toHaveLength(1);
        expect(ModelA._FKS).toMatchObject({
            "ModelB": [
                {
                    path: ["related"],
                    required: true,
                    immutable: false,
                    unique: false,
                    array: false
                },
            ]
        });

        expect(Object.entries(ModelB._FKS)).toHaveLength(1);
        expect(ModelB._FKS).toMatchObject({
            "ModelA": [
                {
                    path: ["related"],
                    required: true,
                    immutable: false,
                    unique: false,
                    array: false
                },
            ]
        });
    });

    it("should error if not given ref in foreign key", async () => {
        const schemaWithObjectIdFK = new Schema({
            related: {
                type: mongoD.Schema.Types.ObjectId,
                ref: "RelatedModel",
                required: true,
            },
        });
    
        const schemaWithEmbeddedDocFK = new Schema({
            related: {
                type: mongoD.Schema.Types.ObjectId,
                required: true,
            },
        });

        await mongoose.model("ModelWithObjectIdFK", schemaWithObjectIdFK);

        try {
            await mongoose.model("ModelWithEmbeddedDocFK", schemaWithEmbeddedDocFK);

            expect(true).toBe(false);
        } catch (error) {
            expect(Object.entries(mongoD.models)).toHaveLength(1);
            expect(Object.entries(mongoD.relations)).toHaveLength(1);

            const schemaWithEmbeddedDocFKUnlinked = new Schema({
                related: {
                    type: mongoD.Schema.Types.ObjectId,
                    required: true,
                    _linked: false
                },
            });

            await mongoose.model("ModelWithEmbeddedDocFKUnlinked", schemaWithEmbeddedDocFKUnlinked);

            expect(Object.entries(mongoD.models)).toHaveLength(2);
            expect(Object.entries(mongoD.relations)).toHaveLength(1);
        }
    });    

    it("should create a model and process foreign indexed keys", async () => {
        const testSchema2 = new Schema({
            name: { type: String, required: true },
            related: {
                type: mongoD.Schema.Types.ObjectId,
                ref: "RelatedModel",
                required: true,
                index: true
            },
        });

        const RelatedModel = await mongoose.model("RelatedModel", relatedSchema);
        const TestModel = await mongoose.model("TestModel", testSchema2);

        expect(mongoD.models).toHaveProperty("TestModel");
        expect(mongoD.models).toHaveProperty("RelatedModel");
        expect(Object.entries(mongoD.relations)).toHaveLength(1);

        expect(Object.entries(TestModel._FKS)).toHaveLength(1);
        expect(TestModel._FKS).toMatchObject({
            "RelatedModel": [
                {
                    path: ["related"],
                    required: true,
                    immutable: false,
                    unique: false,
                    array: false,
                }
            ]
        });
    });

    it("should create with an array of references", async () => {
        const TestModel = await mongoose.model("TestModel", new Schema({
            label: { type: String, required: true },
        }));
        const RelatedModel = await mongoose.model("RelatedModel", new Schema({
            children: [{ type: mongoD.Schema.Types.ObjectId, ref: "TestModel", required: true }],
            po: [String]
        }));

        expect(Object.entries(mongoD.models)).toHaveLength(2);
        expect(mongoD.models).toHaveProperty("TestModel");
        expect(mongoD.models).toHaveProperty("RelatedModel");
        expect(Object.entries(mongoD.relations)).toHaveLength(0);

        expect(RelatedModel).not.toHaveProperty("_FKS");
    });

    it("should delete all cache after collection drop", async () => {
        const TestModel = await mongoose.model("TestModel", testSchema);
        
        await TestModel.dropCollection();

        expect(Object.entries(mongoose.models)).toHaveLength(0);
        expect(Object.entries(mongoD.models)).toHaveLength(0);
    });

    it("should handle getActivate error", async () => {
        const RelatedModel = await mongoose.model("RelatedModel", relatedSchema);

        try{
            const TestModel = await mongoose.model(
                "TestModel", testSchema, undefined, undefined, 
                {
                    "_getActiveForeignKeys": async () => {
            
                        throw new Error("Mocked error")
                    }
                }
            );

            expect(true).toBe(false);
        } catch (e) {
            expect(mongoD.models).not.toHaveProperty("TestModel");
            expect(mongoD.models).toHaveProperty("RelatedModel");
            expect(Object.entries(mongoD.models)).toHaveLength(1);
            expect(Object.entries(mongoose.models)).toHaveLength(1);
            expect(mongoose.models).toHaveProperty("RelatedModel");

            const TestModel = await mongoose.model("TestModel", testSchema);
            expect(Object.entries(mongoD.models)).toHaveLength(2);
            expect(Object.entries(mongoose.models)).toHaveLength(2);
            expect(mongoD.models).toHaveProperty("TestModel");
            expect(mongoD.models).toHaveProperty("RelatedModel");

            expect(Object.entries(TestModel._FKS)).toHaveLength(1);
            expect(TestModel._FKS).toMatchObject({
                "RelatedModel": [
                    {
                        path: ["related"],
                        required: true,
                        immutable: false,
                        unique: false,
                        array: false,
                    }
                ]
            });
        }
    });

    it("should handle populateForeignKeyMetadata error", async () => {
        const RelatedModel = await mongoose.model("RelatedModel", relatedSchema);

        try{
            const TestModel = await mongoose.model(
                "TestModel", testSchema, undefined, undefined, 
                {
                    "_populateForeignKeyMetadata": async () => {
            
                        throw new Error("Mocked error")
                    }
                }
            );

            expect(true).toBe(false);
        } catch (e) {
            expect(mongoD.models).not.toHaveProperty("TestModel");
            expect(mongoD.models).toHaveProperty("RelatedModel");
            expect(Object.entries(mongoD.models)).toHaveLength(1);
            expect(Object.entries(mongoose.models)).toHaveLength(1);
            expect(mongoose.models).toHaveProperty("RelatedModel");

            const TestModel = await mongoose.model("TestModel", testSchema);
            expect(Object.entries(mongoD.models)).toHaveLength(2);
            expect(Object.entries(mongoose.models)).toHaveLength(2);
            expect(mongoD.models).toHaveProperty("TestModel");
            expect(mongoD.models).toHaveProperty("RelatedModel");

            expect(Object.entries(TestModel._FKS)).toHaveLength(1);
            expect(TestModel._FKS).toMatchObject({
                "RelatedModel": [
                    {
                        path: ["related"],
                        required: true,
                        immutable: false,
                        unique: false,
                        array: false,
                    }
                ]
            });
        }
    });

    it("should handle collection drop data inside db", async () => {
        const RelatedModel = await mongoose.model("RelatedModel", relatedSchema);
        await RelatedModel.create({
            title: "test"
        });

        expect((await RelatedModel.find({}))).toHaveLength(1);

        let db = client.connection.db;
        let collections = await db.listCollections().toArray();
        expect(collections.map(col => col.name)).toHaveLength(1);
        expect(collections.map(col => col.name)).toContain("relatedmodels");

        await RelatedModel.dropCollection();

        db = client.connection.db;
        collections = await db.listCollections().toArray();
        expect(collections.map(col => col.name)).toHaveLength(0);
        expect(collections.map(col => col.name)).not.toContain("relatedmodels");

        const RelatedModel2 = await mongoose.model("RelatedModel", relatedSchema);
        expect((await RelatedModel2.find({}))).toHaveLength(0);

        await RelatedModel2.create({
            title: "test"
        });
        expect((await RelatedModel2.find({}))).toHaveLength(1);
        
        db = client.connection.db;
        collections = await db.listCollections().toArray();
        expect(collections.map(col => col.name)).toHaveLength(1);
        expect(collections.map(col => col.name)).toContain("relatedmodels");
    });

    it("should handle erro data inside db", async () => {
        const RelatedModel = await mongoose.model("RelatedModel", relatedSchema);
        await RelatedModel.create({
            title: "test"
        });
        expect((await RelatedModel.find({}))).toHaveLength(1);

        let db = client.connection.db;
        let collections = await db.listCollections().toArray();
        expect(collections.map(col => col.name)).toHaveLength(1);
        expect(collections.map(col => col.name)).toContain("relatedmodels");

        await deleteFromMongoose("RelatedModel");
        delete mongoD.models["RelatedModel"];

        db = client.connection.db;
        collections = await db.listCollections().toArray();
        expect(collections.map(col => col.name)).toHaveLength(1);
        expect(collections.map(col => col.name)).toContain("relatedmodels");

        const RelatedModel2 = await mongoose.model("RelatedModel", new Schema({
            title: { type: String, required: true },
            name: String
        }));
        await RelatedModel2.create({
            title: "test",
            name: "test"
        });

        const models = await RelatedModel2.find({});

        expect(models).toHaveLength(2);
        
        db = client.connection.db;
        collections = await db.listCollections().toArray();
        expect(collections.map(col => col.name)).toHaveLength(1);
        expect(collections.map(col => col.name)).toContain("relatedmodels");
        expect(models).toMatchObject([
            {
                title: 'test',
            },
            {
                title: 'test',
                name: 'test',
            }
        ]);
    });
}, 0);
