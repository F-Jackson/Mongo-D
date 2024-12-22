import { describe, it, beforeEach, expect } from "vitest";
import mongoose, { mongo } from "mongoose";
import { cleanDb, disconnectDb } from "./utils.js";
import { InitModels, Model, Schema } from "../src/index.js";
import { getLastsRelations } from "../src/deletion.js";


describe("Mongo model creation", () => {
    let testSchema;
    let relatedSchema;
    let client;

    beforeEach(async () => {
        client = await cleanDb();

        relatedSchema = new Schema(mongoose, {
            title: { type: String, required: true },
        });
        testSchema = new Schema(mongoose, {
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
        const RelatedModel = Model(mongoose, "RelatedModel", relatedSchema);
        const TestModel = Model(mongoose, "TestModel", testSchema);
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
    });*/

    it("should process paths in schema", async () => {
        const related3 = new Schema(mongoose, {
            title: String
        });

        const related2 = new Schema(mongoose, {
            title: String,
            related3: {
                type: mongoose.Schema.Types.ObjectId,
                ref: "RelatedModel3",
                required: true,
                unique: true,
                immutable: true
            }
        });

        const related = new Schema(mongoose, {
            title: String,
            related2: {
                type: mongoose.Schema.Types.ObjectId,
                ref: "RelatedModel2",
                required: true,
                unique: true,
                immutable: true
            }
        });

        const nestedSchema = new Schema(mongoose, {
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

        const R3 = Model(mongoose, "RelatedModel3", related3);
        const R2 = Model(mongoose, "RelatedModel2", related2);
        const R = Model(mongoose, "RelatedModel", related);

        const NestedModel = Model(mongoose, "NestedModel", nestedSchema);
        await InitModels(client);

        await getLastsRelations(client.__relations["RelatedModel"]);
    }, 0);
/*
    it("should throw error if model with same name exists", async () => {
        const TestModel = Model(mongoose, "TestModel", testSchema);

        try {
            Model(mongoose, "TestModel", relatedSchema)
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
        const simpleSchema = new Schema(mongoose, {
            simpleField: { type: String, required: true },
        });

        const SimpleModel = Model(mongoose, "SimpleModel", simpleSchema);
        await InitModels(client);

        expect(Object.entries(mongoose.__models)).toHaveLength(1);
        expect(mongoose.__models).toHaveProperty("SimpleModel");

        expect(SimpleModel).not.toHaveProperty("_FKS");
    });


    it("should support multiple foreign keys in a single model", async () => {
        const multiFKSchema = new Schema(mongoose, {
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

        const MultiFKModel = Model(mongoose, "MultiFKModel", multiFKSchema);
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

    it("should process paths in schema", async () => {
        const nestedSchema = new Schema(mongoose, {
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
        const NestedModel = Model(mongoose, "NestedModel", nestedSchema);
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
        const nestedSchema = new Schema(mongoose, {
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
        const nestedSchema2 = new Schema(mongoose, {
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
        const nestedSchema = new Schema(mongoose, {
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
        const NestedModel = Model(mongoose, "NestedModel", nestedSchema);
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
        const optionalSchema = new Schema(mongoose, {
            optionalField: {
                type: mongoose.Schema.Types.ObjectId,
                ref: "RelatedModel",
                _linked: false,
                required: false,
            },
        });

        const OptionalModel = Model(mongoose, "OptionalModel", optionalSchema);
        await InitModels(client);

        expect(Object.entries(mongoose.__models)).toHaveLength(1);
        expect(mongoose.__models).toHaveProperty("OptionalModel");

        expect(OptionalModel).not.toHaveProperty("_FKS");
    });

    it("should process foreign keys when multiple models reference the same model", async () => {
        const anotherTestSchema = new Schema(mongoose, {
            anotherName: { type: String, required: true },
            related: {
                type: mongoose.Schema.Types.ObjectId,
                ref: "RelatedModel",
                required: true,
            },
        });

        const RelatedModel = Model(mongoose, "RelatedModel", relatedSchema);
        const TestModel = Model(mongoose, "TestModel", testSchema);
        const AnotherTestModel = Model(mongoose, "AnotherTestModel", anotherTestSchema);
        await InitModels(client);

        expect(Object.entries(mongoose.__models)).toHaveLength(3);
        expect(Object.entries(client.__relations)).toHaveLength(1);
        expect(Object.keys(client.__relations["RelatedModel"])).toMatchObject(["TestModel", "AnotherTestModel"]);
        expect(TestModel).toHaveProperty("_FKS");
        expect(AnotherTestModel).toHaveProperty("_FKS");
    });

    it("should handle circular references", async () => {
        const circularSchemaA = new Schema(mongoose, {
            name: { type: String, required: true },
            related: {
                type: mongoose.Schema.Types.ObjectId,
                ref: "ModelB",
                required: true,
            },
        });
    
        const circularSchemaB = new Schema(mongoose, {
            name: { type: String, required: true },
            related: {
                type: mongoose.Schema.Types.ObjectId,
                ref: "ModelA",
                required: true,
            },
        });
    
        const ModelA = Model(mongoose, "ModelA", circularSchemaA);
        const ModelB = Model(mongoose, "ModelB", circularSchemaB);
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
        const schemaWithObjectIdFK = new Schema(mongoose, {
            related: {
                type: mongoose.Schema.Types.ObjectId,
                ref: "RelatedModel",
                required: true,
            },
        });
    
        const schemaWithEmbeddedDocFK = new Schema(mongoose, {
            related: {
                type: mongoose.Schema.Types.ObjectId,
                required: true,
            },
        });

        Model(mongoose, "ModelWithObjectIdFK", schemaWithObjectIdFK);

        try {
            Model(mongoose, "ModelWithEmbeddedDocFK", schemaWithEmbeddedDocFK);

            await InitModels(client);

            expect(true).toBe(false);
        } catch (error) {
            expect(Object.entries(mongoose.__models)).toHaveLength(1);
            expect(Object.entries(client.__relations)).toHaveLength(1);
            expect(Object.entries(client.__relations["RelatedModel"])).toHaveLength(1);

            const schemaWithEmbeddedDocFKUnlinked = new Schema(mongoose, {
                related: {
                    type: mongoose.Schema.Types.ObjectId,
                    required: true,
                    _linked: false
                },
            });

            Model(mongoose, "ModelWithEmbeddedDocFKUnlinked", schemaWithEmbeddedDocFKUnlinked);
            Model(mongoose, "ModelWithObjectIdFK2", schemaWithObjectIdFK);

            await InitModels(client);

            expect(Object.entries(mongoose.__models)).toHaveLength(3);
            expect(Object.entries(client.__relations)).toHaveLength(1);
            expect(Object.entries(client.__relations["RelatedModel"])).toHaveLength(2);
        }
    });    

    it("should create a model and process foreign indexed keys", async () => {
        const testSchema2 = new Schema(mongoose, {
            name: { type: String, required: true },
            related: {
                type: mongoose.Schema.Types.ObjectId,
                ref: "RelatedModel",
                required: true,
                index: true
            },
        });

        const RelatedModel = Model(mongoose, "RelatedModel", relatedSchema);
        const TestModel = Model(mongoose, "TestModel", testSchema2);
        await InitModels(client);

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
        const TestModel = Model(mongoose, "TestModel", new Schema(mongoose, {
            label: { type: String, required: true },
        }));
        const RelatedModel = Model(mongoose, "RelatedModel", new Schema(mongoose, {
            children: [{ type: mongoose.Schema.Types.ObjectId, ref: "TestModel", required: true }],
            po: [String]
        }));
        await InitModels(client);

        expect(Object.entries(mongoose.__models)).toHaveLength(2);
        expect(mongoose.__models).toHaveProperty("TestModel");
        expect(mongoose.__models).toHaveProperty("RelatedModel");
        expect(Object.entries(client.__relations)).toHaveLength(0);

        expect(RelatedModel).not.toHaveProperty("_FKS");
    });

    it("should handle getActivate error", async () => {
        try{
            Model(mongoose, "RelatedModel", relatedSchema);
            await InitModels(client);

            expect(Object.entries(mongoose.__models)).toHaveLength(1);

            Model(mongoose, "TestModel", testSchema);

            await InitModels(client, {
                "_getActiveForeignKeys": async () => {
                    throw new Error("Mocked error")
                }
            });

            expect(true).toBe(false);
        } catch (e) {
            console.log(mongoose.__models);
            expect(Object.entries(mongoose.__models)).toHaveLength(1);
            expect(mongoose.__models).not.toHaveProperty("TestModel");
            expect(mongoose.__models).toHaveProperty("RelatedModel");
        }
    });

    it("should handle populateForeignKeyMetadata error", async () => {
        Model(mongoose, "RelatedModel", relatedSchema);
        await InitModels(client);

        try{
            Model(mongoose, "TestModel", testSchema);
            await InitModels(client, {
                "_populateForeignKeyMetadata": async () => {
                    throw new Error("Mocked error")
                }
            });

            expect(true).toBe(false);
        } catch (e) {
            expect(mongoose.__models).not.toHaveProperty("TestModel");
            expect(mongoose.__models).toHaveProperty("RelatedModel");
            expect(Object.entries(mongoose.__models)).toHaveLength(1);
            expect(Object.entries(mongoose.__models)).toHaveLength(1);
            expect(mongoose.__models).toHaveProperty("RelatedModel");

            const TestModel = Model(mongoose, "TestModel", testSchema);
            await InitModels(client);

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
    });*/
}, 0);
