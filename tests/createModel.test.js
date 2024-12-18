import { describe, it, beforeEach, expect } from "vitest";
import mongoose from "mongoose";
import { cleanDb, disconnectDb } from "./utils.js";
import { InitModels, Model, Schema } from "../src/index.js";
import { deleteFromMongoose } from "../src/utils.js";

/***************************DROP COLLECTION IS NOT WORKING**************************************/

describe("Mongo model creation", () => {
    let testSchema;
    let relatedSchema;
    let client;

    beforeEach(async () => {
        client = await cleanDb();

        relatedSchema = new Schema({
            title: { type: String, required: true },
        });
        testSchema = new Schema({
            name: { type: String, required: true },
            related: {
                type: mongoose.Schema.Types.ObjectId,
                ref: "RelatedModel",
                required: true,
            },
        });
    });

    afterEach(async () => {
        await disconnectDb(client);
    });

    /*
    it("should create a model and process foreign keys", async () => {
        const RelatedModel = await Model("RelatedModel", relatedSchema);
        const TestModel = await Model("TestModel", testSchema);
        await InitModels(client);

        expect(client.__models).toHaveProperty("TestModel");
        expect(client.__models).toHaveProperty("RelatedModel");

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
        const TestModel = Model("TestModel", testSchema);

        try {
            Model("TestModel", relatedSchema)
        } catch (e) {
            await InitModels(client);

            expect(Object.entries(client.__models)).toHaveLength(1);
            expect(client.__models).toHaveProperty("TestModel");
    
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

    it("should handle models with no foreign keys", async () => {
        const simpleSchema = new Schema({
            simpleField: { type: String, required: true },
        });

        const SimpleModel = Model("SimpleModel", simpleSchema);
        await InitModels(client);

        expect(Object.entries(mongoose.__models)).toHaveLength(1);
        expect(mongoose.__models).toHaveProperty("SimpleModel");

        expect(SimpleModel).not.toHaveProperty("_FKS");
    });


    it("should support multiple foreign keys in a single model", async () => {
        const multiFKSchema = new Schema({
            name: { type: String, required: true },
            related1: {
                type: mongoose.Schema.Types.ObjectId,
                ref: "RelatedModel",
                required: true,
            },
            related2: {
                type: mongoose.Schema.Types.ObjectId,
                ref: "RelatedModel",
                required: false,
            },
        });

        const MultiFKModel = Model("MultiFKModel", multiFKSchema);
        await InitModels(client);

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
        const TestModel = Model("TestModel", relatedSchema);
        await InitModels(client);

        await TestModel.create({title: "test"});
        await TestModel.dropCollection();

        expect(Object.entries(mongoose.__models)).toHaveLength(0);
        let db = client.connection.db;
        let collections = await db.listCollections().toArray();
        expect(collections).toHaveLength(0);
    });

    it("should process paths in schema", async () => {
        const nestedSchema = new Schema({
            nestedField: {
                subField: {
                    type: mongoose.Schema.Types.ObjectId,
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
                        type: [mongoose.Schema.Types.ObjectId],
                        ref: "RelatedModel",
                    },
                    arrayTest: [{ type: mongoose.Schema.Types.ObjectId, ref: "RelatedModel", required: true }]
                }
            },
            lo: [String]
        });
        const NestedModel = Model("NestedModel", nestedSchema);
        await InitModels(client);

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
        const nestedSchema = new Schema({
                nestedField: {
                    subField: {
                        type: mongoose.Schema.Types.ObjectId,
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
                            type: [mongoose.Schema.Types.ObjectId],
                            ref: "RelatedModel",
                        },
                        arrayTest: [
                            { type: mongoose.Schema.Types.ObjectId, ref: "RelatedModel", required: true },
                        ],
                    },
                },
                lo: [String],
        });
        const nestedSchema2 = new Schema({
                isolated: [String],
        });

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
                    type: mongoose.Schema.Types.ObjectId,
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
                        type: [mongoose.Schema.Types.ObjectId],
                        ref: "RelatedModel",
                    },
                    arrayTest: [{ type: mongoose.Schema.Types.ObjectId, ref: "RelatedModel", required: true }]
                }
            },
            lo: [String]
        });
        const NestedModel = Model("NestedModel", nestedSchema);
        await InitModels(client);

        expect(Object.entries(mongoose.__models)).toHaveLength(1);
        expect(mongoose.__models).toHaveProperty("NestedModel");
        expect(Object.entries(client.__relations)).toHaveLength(1);
        expect(Object.entries(client.__relations["RelatedModel"])).toHaveLength(1);
        expect(Object.keys(client.__relations["RelatedModel"])).toMatchObject(["NestedModel"]);

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
                type: mongoose.Schema.Types.ObjectId,
                ref: "RelatedModel",
                _linked: false,
                required: false,
            },
        });

        const OptionalModel = Model("OptionalModel", optionalSchema);
        await InitModels(client);

        expect(Object.entries(mongoose.__models)).toHaveLength(1);
        expect(mongoose.__models).toHaveProperty("OptionalModel");

        expect(OptionalModel).not.toHaveProperty("_FKS");
    });

    it("should process foreign keys when multiple models reference the same model", async () => {
        const anotherTestSchema = new Schema({
            anotherName: { type: String, required: true },
            related: {
                type: mongoose.Schema.Types.ObjectId,
                ref: "RelatedModel",
                required: true,
            },
        });

        const RelatedModel = Model("RelatedModel", relatedSchema);
        const TestModel = Model("TestModel", testSchema);
        const AnotherTestModel = Model("AnotherTestModel", anotherTestSchema);
        await InitModels(client);

        expect(Object.entries(mongoose.__models)).toHaveLength(3);
        expect(Object.entries(client.__relations)).toHaveLength(1);
        expect(Object.keys(client.__relations["RelatedModel"])).toMatchObject(["TestModel", "AnotherTestModel"]);
        expect(TestModel).toHaveProperty("_FKS");
        expect(AnotherTestModel).toHaveProperty("_FKS");
    });*/

    it("should correctly delete a foreign key model and not affect other models", async () => {
        const RelatedModel = Model("RelatedModel", relatedSchema);
        const TestModel = Model("TestModel", testSchema);
        const AnotherTestModel = Model("AnotherTestModell", testSchema);
        await InitModels(client);

        expect(Object.entries(mongoose.__models)).toHaveLength(3);
        expect(Object.entries(client.__relations)).toHaveLength(1);
        expect(Object.keys(client.__relations["RelatedModel"])).toMatchObject(["TestModel", "AnotherTestModell"]);
        expect(Object.keys(TestModel._FKS)).toHaveLength(1);
        expect(Object.keys(AnotherTestModel._FKS)).toHaveLength(1);

        await RelatedModel.dropCollection();

        expect(Object.entries(mongoose.__models)).toHaveLength(2);
        expect(Object.keys(TestModel._FKS)).toHaveLength(0);
        expect(Object.keys(AnotherTestModel._FKS)).toHaveLength(0);

        expect(Object.entries(client.__relations)).toHaveLength(0);
    });

    it("should handle circular references", async () => {
        const circularSchemaA = new Schema({
            name: { type: String, required: true },
            related: {
                type: mongoose.Schema.Types.ObjectId,
                ref: "ModelB",
                required: true,
            },
        });
    
        const circularSchemaB = new Schema({
            name: { type: String, required: true },
            related: {
                type: mongoose.Schema.Types.ObjectId,
                ref: "ModelA",
                required: true,
            },
        });
    
        const ModelA = Model("ModelA", circularSchemaA);
        const ModelB = Model("ModelB", circularSchemaB);
        await InitModels(client);
    
        expect(Object.entries(mongoose.__models)).toHaveLength(2);
        expect(Object.entries(client.__relations)).toHaveLength(2);

        expect(Object.keys(client.__relations["ModelA"])).toMatchObject(["ModelB"]);
        expect(Object.keys(client.__relations["ModelB"])).toMatchObject(["ModelA"]);

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
                type: mongoose.Schema.Types.ObjectId,
                ref: "RelatedModel",
                required: true,
            },
        });
    
        const schemaWithEmbeddedDocFK = new Schema({
            related: {
                type: mongoose.Schema.Types.ObjectId,
                required: true,
            },
        });

        try {
            Model("ModelWithObjectIdFK", schemaWithObjectIdFK);
            Model("ModelWithEmbeddedDocFK", schemaWithEmbeddedDocFK);

            await InitModels(client);

            expect(true).toBe(false);
        } catch (error) {
            expect(Object.entries(mongoose.__models)).toHaveLength(1);
            expect(Object.entries(client.__relations)).toHaveLength(1);
            expect(Object.entries(client.__relations["RelatedModel"])).toHaveLength(1);

            const schemaWithEmbeddedDocFKUnlinked = new Schema({
                related: {
                    type: mongoose.Schema.Types.ObjectId,
                    required: true,
                    _linked: false
                },
            });

            Model("ModelWithEmbeddedDocFKUnlinked", schemaWithEmbeddedDocFKUnlinked);
            Model("ModelWithObjectIdFK2", schemaWithObjectIdFK);

            await InitModels(client);

            expect(Object.entries(mongoose.__models)).toHaveLength(3);
            expect(Object.entries(client.__relations)).toHaveLength(1);
            expect(Object.entries(client.__relations["RelatedModel"])).toHaveLength(2);
        }
    });    

    /*
    it("should create a model and process foreign indexed keys", async () => {
        const testSchema2 = new Schema({
            name: { type: String, required: true },
            related: {
                type: mongoose.Schema.Types.ObjectId,
                ref: "RelatedModel",
                required: true,
                index: true
            },
        });

        const RelatedModel = Model("RelatedModel", relatedSchema);
        const TestModel = Model("TestModel", testSchema2);

        expect(mongoose.__models).toHaveProperty("TestModel");
        expect(mongoose.__models).toHaveProperty("RelatedModel");
        expect(Object.entries(client.__relations)).toHaveLength(1);

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
        const TestModel = Model("TestModel", new Schema({
            label: { type: String, required: true },
        }));
        const RelatedModel = Model("RelatedModel", new Schema({
            children: [{ type: mongoose.Schema.Types.ObjectId, ref: "TestModel", required: true }],
            po: [String]
        }));

        expect(Object.entries(mongoose.__models)).toHaveLength(2);
        expect(mongoose.__models).toHaveProperty("TestModel");
        expect(mongoose.__models).toHaveProperty("RelatedModel");
        expect(Object.entries(client.__relations)).toHaveLength(0);

        expect(RelatedModel).not.toHaveProperty("_FKS");
    });

    it("should delete all cache after collection drop", async () => {
        const TestModel = Model("TestModel", testSchema);
        
        await TestModel.dropCollection();

        expect(Object.entries(mongoose.__models)).toHaveLength(0);
        expect(Object.entries(mongoose.__models)).toHaveLength(0);
    });

    it("should handle getActivate error", async () => {
        const RelatedModel = Model("RelatedModel", relatedSchema);

        try{
            const TestModel = Model(
                "TestModel", testSchema, undefined, undefined, 
                {
                    "_getActiveForeignKeys": async () => {
            
                        throw new Error("Mocked error")
                    }
                }
            );

            expect(true).toBe(false);
        } catch (e) {
            expect(mongoose.__models).not.toHaveProperty("TestModel");
            expect(mongoose.__models).toHaveProperty("RelatedModel");
            expect(Object.entries(mongoose.__models)).toHaveLength(1);
            expect(Object.entries(mongoose.__models)).toHaveLength(1);
            expect(mongoose.__models).toHaveProperty("RelatedModel");

            const TestModel = Model("TestModel", testSchema);
            expect(Object.entries(mongoose.__models)).toHaveLength(2);
            expect(Object.entries(mongoose.__models)).toHaveLength(2);
            expect(mongoose.__models).toHaveProperty("TestModel");
            expect(mongoose.__models).toHaveProperty("RelatedModel");

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
        const RelatedModel = Model("RelatedModel", relatedSchema);

        try{
            const TestModel = Model(
                "TestModel", testSchema, undefined, undefined, 
                {
                    "_populateForeignKeyMetadata": async () => {
            
                        throw new Error("Mocked error")
                    }
                }
            );

            expect(true).toBe(false);
        } catch (e) {
            expect(mongoose.__models).not.toHaveProperty("TestModel");
            expect(mongoose.__models).toHaveProperty("RelatedModel");
            expect(Object.entries(mongoose.__models)).toHaveLength(1);
            expect(Object.entries(mongoose.__models)).toHaveLength(1);
            expect(mongoose.__models).toHaveProperty("RelatedModel");

            const TestModel = Model("TestModel", testSchema);
            expect(Object.entries(mongoose.__models)).toHaveLength(2);
            expect(Object.entries(mongoose.__models)).toHaveLength(2);
            expect(mongoose.__models).toHaveProperty("TestModel");
            expect(mongoose.__models).toHaveProperty("RelatedModel");

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
        const RelatedModel = Model("RelatedModel", relatedSchema);
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

        const RelatedModel2 = Model("RelatedModel", relatedSchema);
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
        const RelatedModel = Model("RelatedModel", relatedSchema);
        await RelatedModel.create({
            title: "test"
        });
        expect((await RelatedModel.find({}))).toHaveLength(1);

        let db = client.connection.db;
        let collections = await db.listCollections().toArray();
        expect(collections.map(col => col.name)).toHaveLength(1);
        expect(collections.map(col => col.name)).toContain("relatedmodels");

        await deleteFromMongoose("RelatedModel");
        delete mongoose.__models["RelatedModel"];

        db = client.connection.db;
        collections = await db.listCollections().toArray();
        expect(collections.map(col => col.name)).toHaveLength(1);
        expect(collections.map(col => col.name)).toContain("relatedmodels");

        const RelatedModel2 = Model("RelatedModel", new Schema({
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
    });*/
}, 0);
