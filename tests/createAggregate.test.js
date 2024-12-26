import { describe, it, beforeEach, expect } from "vitest";
import mongoose from "mongoose";
import { cleanDb, disconnectDb } from "./utils.js";
import { InitModels, Model, Schema } from "../src/index.js";
import { GenerateFoward } from "../src/aggregateGenerator/foward.js";
const util = require('util');


describe("Aggregate Foward", () => {
    let client;

    beforeEach(async () => {
        client = await cleanDb();
    });

    afterEach(async () => {
        await disconnectDb(client);
    });

    it("should create pipeline deep 1", async () => {
        const relatedSchema = new Schema(mongoose, {
            name: { type: String, required: true },
        });
        const testSchema = new Schema(mongoose, {
            title: { type: String, required: true },
            related: {
                type: mongoose.Schema.Types.ObjectId,
                ref: "RelatedModel",
                required: true,
            },
        });

        const RelatedModel = Model(mongoose, "RelatedModel", relatedSchema);
        const TestModel = Model(mongoose, "TestModel", testSchema);
        await InitModels(client);

        const generator = new GenerateFoward({ stop: {
            collection: "",
            bruteForce: false
        }}, client);
        const pipeline = await generator.makeAggregate(TestModel);

        expect(pipeline).toMatchObject([
            {
                $lookup: {
                    from: "relatedmodels",
                    localField: "related",
                    foreignField: "_id",
                    as: "related",
                },
            },
            { $unwind: "$related" },
        ]);
    });

    it("should create pipeline deep 2", async () => {
        const relatedSchema2 = new Schema(mongoose, {
            name: { type: String, required: true },
        });
        const relatedSchema = new Schema(mongoose, {
            name: { type: String, required: true },
            related2: {
                type: mongoose.Schema.Types.ObjectId,
                ref: "RelatedModel2",
                required: true,
            },
        });
        const testSchema = new Schema(mongoose, {
            title: { type: String, required: true },
            related: {
                type: mongoose.Schema.Types.ObjectId,
                ref: "RelatedModel",
                required: true,
            },
        });

        Model(mongoose, "RelatedModel2", relatedSchema2);
        Model(mongoose, "RelatedModel", relatedSchema);
        const TestModel = Model(mongoose, "TestModel", testSchema);
        await InitModels(client);

        const generator = new GenerateFoward({ stop: {
            collection: "",
            bruteForce: false
        }}, client);
        const pipeline = await generator.makeAggregate(TestModel);

        expect(pipeline).toMatchObject([
            {
                $lookup: {
                    from: "relatedmodels",
                    localField: "related",
                    foreignField: "_id",
                    as: "related",
                    pipeline: [
                        {
                            $lookup: {
                                from: "relatedmodel2",
                                localField: "related2",
                                foreignField: "_id",
                                as: "related2",
                            },
                        },
                        { $unwind: "$related2" },
                    ]
                },
            },
            { $unwind: "$related" },
        ]);
    });

    it("should create pipeline deep 1 triple", async () => {
        const relatedSchema = new Schema(mongoose, {
            name: { type: String, required: true },
        });
        const testSchema = new Schema(mongoose, {
            title: { type: String, required: true },
            related: {
                type: mongoose.Schema.Types.ObjectId,
                ref: "RelatedModel",
                required: true,
            },
            related2: {
                type: mongoose.Schema.Types.ObjectId,
                ref: "RelatedModel",
                required: true,
            },
            related3: {
                type: mongoose.Schema.Types.ObjectId,
                ref: "RelatedModel",
                required: true,
            },
        });

        const RelatedModel = Model(mongoose, "RelatedModel", relatedSchema);
        const TestModel = Model(mongoose, "TestModel", testSchema);
        await InitModels(client);

        const generator = new GenerateFoward({ stop: {
            collection: "",
            bruteForce: false
        }}, client);
        const pipeline = await generator.makeAggregate(TestModel);

        expect(pipeline).toMatchObject([
            {
                $lookup: {
                    from: "relatedmodels",
                    localField: "related",
                    foreignField: "_id",
                    as: "related",
                },
            },
            { $unwind: "$related" },
            {
                $lookup: {
                    from: "relatedmodels",
                    localField: "related2",
                    foreignField: "_id",
                    as: "related2",
                },
            },
            { $unwind: "$related2" },
            {
                $lookup: {
                    from: "relatedmodels",
                    localField: "related3",
                    foreignField: "_id",
                    as: "related3",
                },
            },
            { $unwind: "$related3" },
        ]);
    });

    it("should create pipeline deep 2 triple", async () => {
        const relatedSchema2 = new Schema(mongoose, {
            name: { type: String, required: true },
        });
        const relatedSchema = new Schema(mongoose, {
            name: { type: String, required: true },
            rr: {
                type: mongoose.Schema.Types.ObjectId,
                ref: "RelatedModel2",
                required: true,
            },
            rr2: {
                type: mongoose.Schema.Types.ObjectId,
                ref: "RelatedModel2",
                required: true,
            },
            rr3: {
                type: mongoose.Schema.Types.ObjectId,
                ref: "RelatedModel2",
                required: true,
            },
        });
        const testSchema = new Schema(mongoose, {
            title: { type: String, required: true },
            related: {
                type: mongoose.Schema.Types.ObjectId,
                ref: "RelatedModel",
                required: true,
            },
            related2: {
                type: mongoose.Schema.Types.ObjectId,
                ref: "RelatedModel",
                required: true,
            },
            related3: {
                type: mongoose.Schema.Types.ObjectId,
                ref: "RelatedModel",
                required: true,
            },
        });

        Model(mongoose, "RelatedModel2", relatedSchema2);
        Model(mongoose, "RelatedModel", relatedSchema);
        const TestModel = Model(mongoose, "TestModel", testSchema);
        await InitModels(client);

        const generator = new GenerateFoward({ stop: {
            collection: "",
            bruteForce: false
        }}, client);
        const pipeline = await generator.makeAggregate(TestModel);

        expect(pipeline).toMatchObject([
            {
                $lookup: {
                    from: "relatedmodels",
                    localField: "related",
                    foreignField: "_id",
                    as: "related",
                    pipeline: [
                        {
                            $lookup: {
                                from: "relatedmodel2",
                                localField: "rr",
                                foreignField: "_id",
                                as: "rr",
                            },
                        },
                        { $unwind: "$rr" },
                        {
                            $lookup: {
                                from: "relatedmodel2",
                                localField: "rr2",
                                foreignField: "_id",
                                as: "rr2",
                            },
                        },
                        { $unwind: "$rr2" },
                        {
                            $lookup: {
                                from: "relatedmodel2",
                                localField: "rr3",
                                foreignField: "_id",
                                as: "rr3",
                            },
                        },
                        { $unwind: "$rr3" },
                    ]
                },
            },
            { $unwind: "$related" },
            {
                $lookup: {
                    from: "relatedmodels",
                    localField: "related2",
                    foreignField: "_id",
                    as: "related2",
                    pipeline: [
                        {
                            $lookup: {
                                from: "relatedmodel2",
                                localField: "rr",
                                foreignField: "_id",
                                as: "rr",
                            },
                        },
                        { $unwind: "$rr" },
                        {
                            $lookup: {
                                from: "relatedmodel2",
                                localField: "rr2",
                                foreignField: "_id",
                                as: "rr2",
                            },
                        },
                        { $unwind: "$rr2" },
                        {
                            $lookup: {
                                from: "relatedmodel2",
                                localField: "rr3",
                                foreignField: "_id",
                                as: "rr3",
                            },
                        },
                        { $unwind: "$rr3" },
                    ]
                },
            },
            { $unwind: "$related2" },
            {
                $lookup: {
                    from: "relatedmodels",
                    localField: "related3",
                    foreignField: "_id",
                    as: "related3",
                    pipeline: [
                        {
                            $lookup: {
                                from: "relatedmodel2",
                                localField: "rr",
                                foreignField: "_id",
                                as: "rr",
                            },
                        },
                        { $unwind: "$rr" },
                        {
                            $lookup: {
                                from: "relatedmodel2",
                                localField: "rr2",
                                foreignField: "_id",
                                as: "rr2",
                            },
                        },
                        { $unwind: "$rr2" },
                        {
                            $lookup: {
                                from: "relatedmodel2",
                                localField: "rr3",
                                foreignField: "_id",
                                as: "rr3",
                            },
                        },
                        { $unwind: "$rr3" },
                    ]
                },
            },
            { $unwind: "$related3" },
        ]);
    });
});