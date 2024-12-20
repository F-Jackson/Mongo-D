import { describe, it, beforeEach, expect } from "vitest";
import { cleanDb, disconnectDb } from "./utils.js";
import mongoose from "mongoose";
import { InitModels, Model, Schema } from "../src/index.js";

describe("Mongo instance creation", () => {
    let client;
    let testSchema;
    let relatedSchema;

    beforeEach(async () => {
        client = await cleanDb();
    }, 0);

    afterEach(async () => {
        await disconnectDb(client);
    });

    it("should create fk", async () => {
        testSchema = new Schema(mongoose, {
            title: { type: String, required: true },
            related: {
                type: mongoose.Schema.Types.ObjectId,
                ref: "RelatedModel",
                required: true,
                immutable: true
            },
            ui: {
                related2: {
                    type: mongoose.Schema.Types.ObjectId,
                    ref: "RelatedModel",
                    required: true,
                    immutable: true
                }
            },
        });
        relatedSchema = new Schema(mongoose, {
            title: { type: String, required: true },
        });

        const TestModel = Model(mongoose, "TestModel", testSchema);
        const RelatedModel = Model(mongoose, "RelatedModel", relatedSchema);
        await InitModels(client);

        const related = await RelatedModel.Create({ title: "Related" });
        const related2 = await RelatedModel.Create({ title: "Related2" });
        const test = await TestModel.Create([
            { 
                title: "Test", 
                related: related,
                ui: { related2: related2 }
            },
            { 
                title: "Test2", 
                related: related,
                ui: { related2: related2 }
            }
        ]);

        expect(test).toMatchObject([
            { 
                title: "Test", 
                related: related,
                ui: { related2: related2 }
            },
            { 
                title: "Test2", 
                related: related,
                ui: { related2: related2 }
            }
        ]);

        const tests = (await TestModel.find({}).lean()).map(t => ({ 
            related: t.related._id.toString(),
            title: t.title,
            ui: {
                related2: t.ui.related2._id.toString()
            }
        }));
        
        const normalizedTests = tests.sort((a, b) => a.title.localeCompare(b.title));
        
        expect(normalizedTests).toMatchObject([
            { 
                title: "Test", 
                related: related._id.toString(),
                ui: { related2: related2._id.toString() }
            },
            { 
                title: "Test2", 
                related: related._id.toString(),
                ui: { related2: related2._id.toString() }
            }
        ]);        
    });

    it("should create array fk", async () => {
        testSchema = new Schema(mongoose, {
            title: { type: String, required: true },
            related: {
                type: [ mongoose.Schema.Types.ObjectId ],
                ref: "RelatedModel",
                required: true,
                immutable: true
            },
        });
        relatedSchema = new Schema(mongoose, {
            title: { type: String, required: true },
        });

        const TestModel = Model(mongoose, "TestModel", testSchema);
        const RelatedModel = Model(mongoose, "RelatedModel", relatedSchema);

        await InitModels(client);

        const related = await RelatedModel.Create({ title: "Related" });
        const related2 = await RelatedModel.Create({ title: "Related2" });
        const related3 = await RelatedModel.Create({ title: "Related3" });

        const test = await TestModel.Create([
            { 
                title: "Test", 
                related: [related, related2],
            },
            { 
                title: "Test2", 
                related: [related, related2, related3],
            }
        ]);

        expect(test.map(t => ({ 
            related: t.related.map(r => r._id.toString()),
            title: t.title,
        }))).toMatchObject([
            { 
                title: "Test", 
                related: [related._id.toString(), related2._id.toString()]
            },
            { 
                title: "Test2", 
                related: [related._id.toString(), related2._id.toString(), related3._id.toString()]
            }
        ]);

        const tests = (await TestModel.find({}).lean()).map(t => ({ 
            related: t.related.map(r => r._id.toString()),
            title: t.title,
        }));
        
        const normalizedTests = tests.sort((a, b) => a.title.localeCompare(b.title));
        
        expect(normalizedTests).toMatchObject([
            { 
                title: "Test", 
                related: [related._id.toString(), related2._id.toString()]
            },
            { 
                title: "Test2", 
                related: [related._id.toString(), related2._id.toString(), related3._id.toString()]
            }
        ]);        
    });

    it("should error create fk with fake id", async () => {
        testSchema = new Schema(mongoose, {
            title: { type: String, required: true },
            related: {
                type: mongoose.Schema.Types.ObjectId,
                ref: "RelatedModel",
                required: true,
                immutable: true
            },
            ui: {
                related2: {
                    type: mongoose.Schema.Types.ObjectId,
                    ref: "RelatedModel",
                    required: true,
                    immutable: true
                }
            },
        });
        relatedSchema = new Schema(mongoose, {
            title: { type: String, required: true },
        });

        const TestModel = Model(mongoose, "TestModel", testSchema);
        const RelatedModel = Model(mongoose, "RelatedModel", relatedSchema);

        await InitModels(client);

        const related = await RelatedModel.Create({ title: "Related" });
        const related2 = await RelatedModel.Create({ title: "Related2" });

        let error;
        try {
            await TestModel.Create(
                [
                    { 
                        title: "Test", 
                        related: related._id,
                        ui: { related2: related2._id }
                    },
                    { 
                        title: "Test2", 
                        related: new mongoose.Types.ObjectId(),
                        ui: { related2: related2._id }
                    }
                ],
                true
            );
        } catch (err) {
            error = err;
        }
    
        expect(error).toBeDefined();
        expect(error.message).toMatch(/Cannot find all linked IDs in model/i);

        const testes = await TestModel.find({});
        expect(testes).toHaveLength(0);
    });

    it("should error create array fk", async () => {
        testSchema = new Schema(mongoose, {
            title: { type: String, required: true },
            related: {
                type: [ mongoose.Schema.Types.ObjectId ],
                ref: "RelatedModel",
                required: true,
                immutable: true
            },
        });
        relatedSchema = new Schema(mongoose, {
            title: { type: String, required: true },
        });

        const TestModel = Model(mongoose, "TestModel", testSchema);
        const RelatedModel = Model(mongoose, "RelatedModel", relatedSchema);

        await InitModels(client);

        const related = await RelatedModel.Create({ title: "Related" });
        const related2 = await RelatedModel.Create({ title: "Related2" });
        const related3 = new mongoose.Types.ObjectId();

        let error;
        try {
            await TestModel.Create([
                { 
                    title: "Test", 
                    related: [related, related2],
                },
                { 
                    title: "Test2", 
                    related: [related, related2, related3],
                }
            ]);
        } catch (err) {
            error = err;
        }
    
        const testes = await TestModel.find({});
        expect(testes).toHaveLength(0);   

        expect(error).toBeDefined();
        expect(error.message).toMatch(/Cannot find all linked IDs in model/i); 
    });
});