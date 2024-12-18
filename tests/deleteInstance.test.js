import { describe, it, beforeEach, expect } from "vitest";
import { cleanDb, disconnectDb } from "./utils.js";
import { InitModels, Model, Schema } from "../src/index.js";
import mongoose from "mongoose";

describe("Mongo model Delete", () => {
    let client;

    beforeEach(async () => {
        client = await cleanDb();
    }, 0);

    afterEach(async () => {
        await disconnectDb(client);
    }, 0);

    it("should delete with required", async () => {
        const relatedSchema = new Schema({
            title: { type: String, required: true },
        });
        const testSchema = new Schema({
            name: { type: String, required: true },
            related: {
                type: mongoose.Schema.Types.ObjectId,
                ref: "RelatedModel",
                required: true,
            },
        });

        const RelatedModel = Model("RelatedModel", relatedSchema);
        const TestModel = Model("TestModel", testSchema);

        await InitModels(client);

        const related = await RelatedModel.Create({ title: "Related" });
        const tests = await TestModel.Create([
            { 
                name: "Test", 
                related: related
            },
            { 
                name: "Test2", 
                related: related
            }
        ]);
        expect(tests).toHaveLength(2);
        await RelatedModel.Delete({ _id: related._id });

        const testes = await TestModel.find({});
        expect(testes).toHaveLength(0);

        const relateds = await RelatedModel.find({});
        expect(relateds).toHaveLength(0);
    }, 0);

    it("should nested delete with required", async () => {
        const relatedSchema = new Schema({
            title: { type: String, required: true },
        });
        const testSchema = new Schema({
            name: { type: String, required: true },
            nested: {
                related: {
                    type: mongoose.Schema.Types.ObjectId,
                    ref: "RelatedModel",
                    required: true,
                }
            },
        });

        const RelatedModel = Model("RelatedModel", relatedSchema);
        const TestModel = Model("TestModel", testSchema);

        await InitModels(client);

        const related = await RelatedModel.Create({ title: "Related" });
        const tests = await TestModel.Create([
            { 
                name: "Test", 
                nested: {
                    related: related
                }
            },
            { 
                name: "Test2", 
                nested: {
                    related: related
                }
            }
        ]);
        expect(tests).toHaveLength(2);
        await RelatedModel.Delete({ _id: related._id });

        const testes = await TestModel.find({});
        expect(testes).toHaveLength(0);

        const relateds = await RelatedModel.find({});
        expect(relateds).toHaveLength(0);
    }, 0);

    it("should array delete with required", async () => {
        const relatedSchema = new Schema({
            title: { type: String, required: true },
        });
        const testSchema = new Schema({
            name: { type: String, required: true },
            related: {
                type: [ mongoose.Schema.Types.ObjectId ],
                ref: "RelatedModel",
                required: true,
            },
        });

        const RelatedModel = Model("RelatedModel", relatedSchema);
        const TestModel = Model("TestModel", testSchema);

        await InitModels(client);

        const related = await RelatedModel.Create({ title: "Related" });
        const related2 = await RelatedModel.Create({ title: "Related2" });
        const related3 = await RelatedModel.Create({ title: "Related3" });

        const tests = await TestModel.Create([
            { 
                name: "Test", 
                related: [ related, related2, related3 ]
            },
            { 
                name: "Test2", 
                related: [ related, related2, related3 ]
            }
        ]);

        expect(tests).toHaveLength(2);
        expect(tests[0].related).toHaveLength(3);
        expect(tests[1].related).toHaveLength(3);

        await RelatedModel.Delete({ _id: related._id });

        const testes = await TestModel.find({});
        expect(testes).toHaveLength(2);
        expect(testes[0].related).toHaveLength(2);
        expect(testes[1].related).toHaveLength(2);

        const relateds = await RelatedModel.find({});
        expect(relateds).toHaveLength(2);
    }, 0);

    it("should delete without required", async () => {
        const relatedSchema = new Schema({
            title: { type: String, required: true },
        });
        const testSchema = new Schema({
            name: { type: String, required: true },
            related: {
                type: mongoose.Schema.Types.ObjectId,
                ref: "RelatedModel",
            },
        });

        const RelatedModel = Model("RelatedModel", relatedSchema);
        const TestModel = Model("TestModel", testSchema);

        await InitModels(client);

        const related = await RelatedModel.Create({ title: "Related" });
        const tests = await TestModel.Create([
            { 
                name: "Test", 
                related: related
            },
            { 
                name: "Test2", 
                related: related
            }
        ]);
        expect(tests).toHaveLength(2);
        await RelatedModel.Delete({ _id: related._id });

        const testes = await TestModel.find({});
        expect(testes).toHaveLength(2);
        expect(testes[0].related).toBeNull();
        expect(testes[1].related).toBeNull();

        const relateds = await RelatedModel.find({});
        expect(relateds).toHaveLength(0);
    }, 0);

    it("should nested delete without required", async () => {
        const relatedSchema = new Schema({
            title: { type: String, required: true },
        });
        const testSchema = new Schema({
            name: { type: String, required: true },
            nested: {
                related: {
                    type: mongoose.Schema.Types.ObjectId,
                    ref: "RelatedModel",
                }
            },
        });

        const RelatedModel = Model("RelatedModel", relatedSchema);
        const TestModel = Model("TestModel", testSchema);

        await InitModels(client);

        const related = await RelatedModel.Create({ title: "Related" });
        const tests = await TestModel.Create([
            { 
                name: "Test", 
                nested: {
                    related: related
                }
            },
            { 
                name: "Test2", 
                nested: {
                    related: related
                }
            }
        ]);
        expect(tests).toHaveLength(2);
        await RelatedModel.Delete({ _id: related._id });

        const testes = await TestModel.find({});
        expect(testes).toHaveLength(2);
        expect(testes[0].nested.related).toBeNull();
        expect(testes[1].nested.related).toBeNull();

        const relateds = await RelatedModel.find({});
        expect(relateds).toHaveLength(0);
    }, 0);

    it("should array delete without required", async () => {
        const relatedSchema = new Schema({
            title: { type: String, required: true },
        });
        const testSchema = new Schema({
            name: { type: String, required: true },
            related: {
                type: [ mongoose.Schema.Types.ObjectId ],
                ref: "RelatedModel",
            },
        });

        const RelatedModel = Model("RelatedModel", relatedSchema);
        const TestModel = Model("TestModel", testSchema);

        await InitModels(client);

        const related = await RelatedModel.Create({ title: "Related" });
        const related2 = await RelatedModel.Create({ title: "Related2" });
        const related3 = await RelatedModel.Create({ title: "Related3" });

        const tests = await TestModel.Create([
            { 
                name: "Test", 
                related: [ related, related2, related3 ]
            },
            { 
                name: "Test2", 
                related: [ related, related2, related3 ]
            }
        ]);

        expect(tests).toHaveLength(2);
        expect(tests[0].related).toHaveLength(3);
        expect(tests[1].related).toHaveLength(3);

        await RelatedModel.Delete({ _id: related._id });

        const testes = await TestModel.find({});
        expect(testes).toHaveLength(2);
        expect(testes[0].related).toHaveLength(2);
        expect(testes[1].related).toHaveLength(2);

        const relateds = await RelatedModel.find({});
        expect(relateds).toHaveLength(2);
    }, 0);

    it("should delete with immutable and delete", async () => {
        const relatedSchema = new Schema({
            title: { type: String, required: true },
        });
        const testSchema = new Schema({
            name: { type: String, required: true },
            related: {
                type: mongoose.Schema.Types.ObjectId,
                ref: "RelatedModel",
                immutable: true,
            },
        });

        const RelatedModel = Model("RelatedModel", relatedSchema);
        const TestModel = Model("TestModel", testSchema);

        await InitModels(client);

        const related = await RelatedModel.Create({ title: "Related" });
        const tests = await TestModel.Create([
            { 
                name: "Test", 
                related: related
            },
            { 
                name: "Test2", 
                related: related
            }
        ]);
        expect(tests).toHaveLength(2);
        await RelatedModel.Delete({ _id: related._id });

        const testes = await TestModel.find({});
        expect(testes).toHaveLength(0);

        const relateds = await RelatedModel.find({});
        expect(relateds).toHaveLength(0);
    }, 0);

    it("should nested delete with immutable and delete", async () => {
        const relatedSchema = new Schema({
            title: { type: String, required: true },
        });
        const testSchema = new Schema({
            name: { type: String, required: true },
            nested: {
                related: {
                    type: mongoose.Schema.Types.ObjectId,
                    ref: "RelatedModel",
                    immutable: true
                }
            },
        });

        const RelatedModel = Model("RelatedModel", relatedSchema);
        const TestModel = Model("TestModel", testSchema);

        await InitModels(client);

        const related = await RelatedModel.Create({ title: "Related" });
        const tests = await TestModel.Create([
            { 
                name: "Test", 
                nested: {
                    related: related
                }
            },
            { 
                name: "Test2", 
                nested: {
                    related: related
                }
            }
        ]);
        expect(tests).toHaveLength(2);
        await RelatedModel.Delete({ _id: related._id });

        const testes = await TestModel.find({});
        expect(testes).toHaveLength(0);

        const relateds = await RelatedModel.find({});
        expect(relateds).toHaveLength(0);
    }, 0);

    it("should array delete with immutable and delete", async () => {
        const relatedSchema = new Schema({
            title: { type: String, required: true },
        });
        const testSchema = new Schema({
            name: { type: String, required: true },
            related: {
                type: [ mongoose.Schema.Types.ObjectId ],
                ref: "RelatedModel",
                immutable: true
            },
        });

        const RelatedModel = Model("RelatedModel", relatedSchema);
        const TestModel = Model("TestModel", testSchema);

        await InitModels(client);

        const related = await RelatedModel.Create({ title: "Related" });
        const related2 = await RelatedModel.Create({ title: "Related2" });
        const related3 = await RelatedModel.Create({ title: "Related3" });

        const tests = await TestModel.Create([
            { 
                name: "Test", 
                related: [ related, related2, related3 ]
            },
            { 
                name: "Test2", 
                related: [ related, related2, related3 ]
            }
        ]);

        expect(tests).toHaveLength(2);
        expect(tests[0].related).toHaveLength(3);
        expect(tests[1].related).toHaveLength(3);

        try {
            await RelatedModel.Delete({ _id: related._id });

            expect(true).toBe(false);
        } catch (e) {
            const testes = await TestModel.find({});
            expect(testes).toHaveLength(2);
            expect(testes[0].related).toHaveLength(3);
            expect(testes[1].related).toHaveLength(3);

            const relateds = await RelatedModel.find({});
            expect(relateds).toHaveLength(3);
        }
    }, 0);

    it("should delete with immutable and keep", async () => {
        const relatedSchema = new Schema({
            title: { type: String, required: true },
        });
        const testSchema = new Schema({
            name: { type: String, required: true },
            nested: {
                related: {
                    type: mongoose.Schema.Types.ObjectId,
                    ref: "RelatedModel",
                    immutable: true
                }
            },
        });

        const RelatedModel = Model("RelatedModel", relatedSchema);
        const TestModel = Model("TestModel", testSchema);

        await InitModels(client);

        const related = await RelatedModel.Create({ title: "Related" });
        const tests = await TestModel.Create([
            { 
                name: "Test", 
                nested: {
                    related: related
                }
            },
            { 
                name: "Test2", 
                nested: {
                    related: related
                }
            }
        ]);
        expect(tests).toHaveLength(2);
        await RelatedModel.Delete({ _id: related._id }, "keep");

        const testes = await TestModel.find({});
        expect(testes).toHaveLength(2);
        expect(testes[0].nested.related).toBeTruthy();
        expect(testes[1].nested.related).toBeTruthy();

        const relateds = await RelatedModel.find({});
        expect(relateds).toHaveLength(0);
    }, 0);

    it("should nested delete with immutable and delete", async () => {
        const relatedSchema = new Schema({
            title: { type: String, required: true },
        });
        const testSchema = new Schema({
            name: { type: String, required: true },
            nested: {
                related: {
                    type: mongoose.Schema.Types.ObjectId,
                    ref: "RelatedModel",
                    immutable: true
                }
            },
        });

        const RelatedModel = Model("RelatedModel", relatedSchema);
        const TestModel = Model("TestModel", testSchema);

        await InitModels(client);

        const related = await RelatedModel.Create({ title: "Related" });
        const tests = await TestModel.Create([
            { 
                name: "Test", 
                nested: {
                    related: related
                }
            },
            { 
                name: "Test2", 
                nested: {
                    related: related
                }
            }
        ]);
        expect(tests).toHaveLength(2);
        await RelatedModel.Delete({ _id: related._id }, "keep");

        const testes = await TestModel.find({});
        expect(testes).toHaveLength(2);
        expect(testes[0].nested.related).toBeTruthy();
        expect(testes[1].nested.related).toBeTruthy();

        const relateds = await RelatedModel.find({});
        expect(relateds).toHaveLength(0);
    }, 0);

    it("should array delete with immutable and keep", async () => {
        const relatedSchema = new Schema({
            title: { type: String, required: true },
        });
        const testSchema = new Schema({
            name: { type: String, required: true },
            related: {
                type: [ mongoose.Schema.Types.ObjectId ],
                ref: "RelatedModel",
                immutable: true
            },
        });

        const RelatedModel = Model("RelatedModel", relatedSchema);
        const TestModel = Model("TestModel", testSchema);

        await InitModels(client);

        const related = await RelatedModel.Create({ title: "Related" });
        const related2 = await RelatedModel.Create({ title: "Related2" });
        const related3 = await RelatedModel.Create({ title: "Related3" });

        const tests = await TestModel.Create([
            { 
                name: "Test", 
                related: [ related, related2, related3 ]
            },
            { 
                name: "Test2", 
                related: [ related, related2, related3 ]
            }
        ]);

        expect(tests).toHaveLength(2);
        expect(tests[0].related).toHaveLength(3);
        expect(tests[1].related).toHaveLength(3);

        try {
            await RelatedModel.Delete({ _id: related._id }, "keep");

            expect(true).toBe(false);
        } catch (e) {
            const testes = await TestModel.find({});
            expect(testes).toHaveLength(2);
            expect(testes[0].related).toHaveLength(3);
            expect(testes[1].related).toHaveLength(3);

            const relateds = await RelatedModel.find({});
            expect(relateds).toHaveLength(3);
        }
    }, 0);

    it("should nested and array delete with required", async () => {
        const relatedSchema = new Schema({
            title: { type: String, required: true },
        });
        const testSchema = new Schema({
            name: { type: String, required: true },
            nested: {
                related: {
                    type: [ mongoose.Schema.Types.ObjectId ],
                    ref: "RelatedModel",
                    required: true,
                }
            },
        });

        const RelatedModel = Model("RelatedModel", relatedSchema);
        const TestModel = Model("TestModel", testSchema);

        await InitModels(client);

        const related = await RelatedModel.Create({ title: "Related" });
        const related2 = await RelatedModel.Create({ title: "Related2" });
        const related3 = await RelatedModel.Create({ title: "Related3" });

        const tests = await TestModel.Create([
            { 
                name: "Test", 
                nested: {
                    related: [ related, related2, related3 ]
                }
            },
            { 
                name: "Test2", 
                nested: {
                    related: [ related, related2, related3 ]
                }
            }
        ]);

        expect(tests).toHaveLength(2);
        expect(tests[0].nested.related).toHaveLength(3);
        expect(tests[1].nested.related).toHaveLength(3);

        await RelatedModel.Delete({ _id: related._id });

        const testes = await TestModel.find({});
        expect(testes).toHaveLength(2);
        expect(testes[0].nested.related).toHaveLength(2);
        expect(testes[1].nested.related).toHaveLength(2);

        const relateds = await RelatedModel.find({});
        expect(relateds).toHaveLength(2);
    }, 0);
}, 0);