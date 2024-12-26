import { describe, it, beforeEach, expect } from "vitest";
import mongoose from "mongoose";
import { cleanDb, disconnectDb } from "./utils.js";
import { InitModels, Model, Schema } from "../src/index.js";
import { GenerateFoward } from "../src/aggregateGenerator/foward.js";


describe("Aggregate Foward", () => {
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

    it("should create pipeline", async () => {
        const RelatedModel = Model(mongoose, "RelatedModel", relatedSchema);
        const TestModel = Model(mongoose, "TestModel", testSchema);
        await InitModels(client);

        const generator = new GenerateFoward({}, client);
        const pipeline = await generator.makeAggregate(TestModel);

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
});