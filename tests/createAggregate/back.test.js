import { describe, it, beforeEach, expect } from "vitest";
import mongoose from "mongoose";
import { cleanDb, disconnectDb } from "../utils.js";
import { InitModels, Model, Schema } from "../../src/index.js";
import { GenerateBack } from "../../src/aggregateGenerator/back.js";
const util = require('util');


describe("Aggregate Back", () => {
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
            name: { type: String, required: true },
            related: {
                type: mongoose.Schema.Types.ObjectId,
                ref: "RelatedModel",
                required: true,
            },
        });

        const RelatedModel = Model(mongoose, "RelatedModel", relatedSchema);
        const TestModel = Model(mongoose, "TestModel", testSchema);
        await InitModels(client);

        const generator = new GenerateBack({ stop: {
            collection: "",
            bruteForce: false
        }}, client);
        const pipeline = await generator.makeAggregate(RelatedModel);

        expect(pipeline).toMatchObject([
            {
                '$lookup': {
                    from: 'testmodels',
                    localField: '_id',
                    foreignField: 'related',
                    as: 'testmodels'
                }
            },
            { '$unwind': '$testmodels' },
            {
                '$addFields': { 
                    __relatedTo__: [ 
                        { '_$_TestModel': 'testmodels' } 
                    ] 
                }
            },
            { 
                '$project': { testmodels: 0 } 
            },
            { '$group': { 
                    _id: '$_id', 
                    uniqueDocument: { '$first': '$$ROOT' } 
                }
            },
            { '$replaceRoot': { newRoot: '$uniqueDocument' } }
        ]);

        const r = await RelatedModel.create({ name: "Related" });
        const t = await TestModel.create({ name: "Test", related: r });
        const t2 = await TestModel.create({ name: "Test2", related: r });

        const aggregated = await RelatedModel.aggregate(pipeline);
        console.log(aggregated[0]["__relatedTo__"]);

        expect(aggregated).toMatchObject([
            {
                _id: r._id,
                name: 'Related',
                __v: 0,
                __relatedTo__: [ { '_$_TestModel': 'testmodels' } ]
            }
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
            name: { type: String, required: true },
            related: {
                type: mongoose.Schema.Types.ObjectId,
                ref: "RelatedModel",
                required: true,
            },
        });

        const RelatedModel2 = Model(mongoose, "RelatedModel2", relatedSchema2);
        const RelatedModel = Model(mongoose, "RelatedModel", relatedSchema);
        const TestModel = Model(mongoose, "TestModel", testSchema);
        await InitModels(client);

        const generator = new GenerateBack({ stop: {
            collection: "",
            bruteForce: false
        }}, client);
        const pipeline = await generator.makeAggregate(RelatedModel2);

        expect(pipeline).toMatchObject([
            {
                '$lookup': {
                    from: 'relatedmodels',
                    localField: '_id',
                    foreignField: 'related2',
                    as: 'relatedmodels'
                }
            },
            { '$unwind': '$relatedmodels' },
            {
                '$lookup': {
                    from: 'testmodels',
                    localField: 'relatedmodels._id',
                    foreignField: 'related',
                    as: 'testmodels'
                }
            },
            { '$unwind': '$testmodels' },            
            {
                '$addFields': { 
                    __relatedTo__: [ 
                        {  
                            '_$_RelatedModel': {
                                '$mergeObjects': [ 
                                    '$RelatedModel', 
                                    { '_$_TestModel': 'testmodels' } 
                                ]
                            }                    
                        } 
                    ] 
                }
            },
            { 
                '$project': { relatedmodels: 0, testmodels: 0  } 
            },
            { '$group': { 
                    _id: '$_id', 
                    uniqueDocument: { '$first': '$$ROOT' } 
                }
            },
            { '$replaceRoot': { newRoot: '$uniqueDocument' } }
        ]);

        const rb = await RelatedModel2.create({ name: "Related" });
        const rb2 = await RelatedModel2.create({ name: "Related" });

        const r = await RelatedModel.create({ name: "Related", related2: rb });
        const r2 = await RelatedModel.create({ name: "Related", related2: rb2 });

        const t = await TestModel.create({ name: "Test", related: r });
        const t2 = await TestModel.create({ name: "Test2", related: r2 });

        const aggregated = await RelatedModel2.aggregate(pipeline);

        console.log(util.inspect(aggregated, { showHidden: false, depth: null, colors: true }));

        expect(aggregated).toMatchObject([
            {
                _id: r._id,
                name: 'Related',
                __v: 0,
                __relatedTo__: [ { '_$_TestModel': 'testmodels' } ]
            }
        ]);
    });

    /*
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

    it("should create pipeline deep 4 with diferrents fields", async () => {
        const relatedSchema4 = new Schema(mongoose, {
            name: { type: String, required: true },
        });
        const relatedSchema3 = new Schema(mongoose, {
            name: { type: String, required: true },
        });
        const relatedSchema2 = new Schema(mongoose, {
            name: { type: String, required: true },
            r4: {
                type: mongoose.Schema.Types.ObjectId,
                ref: "RelatedModel4",
                required: true,
            },
        });
        const relatedSchema = new Schema(mongoose, {
            name: { type: String, required: true },
            rr2: {
                type: mongoose.Schema.Types.ObjectId,
                ref: "RelatedModel2",
                required: true,
            },
            rr3: {
                type: mongoose.Schema.Types.ObjectId,
                ref: "RelatedModel3",
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
                ref: "RelatedModel2",
                required: true,
            },
        });

        Model(mongoose, "RelatedModel4", relatedSchema4);
        Model(mongoose, "RelatedModel3", relatedSchema3);
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
                                localField: "rr2",
                                foreignField: "_id",
                                as: "rr2",
                                pipeline: [
                                    {
                                        $lookup: {
                                            from: "relatedmodel4",
                                            localField: "r4",
                                            foreignField: "_id",
                                            as: "r4"
                                        },
                                    },
                                    { $unwind: "$r4" },
                                ]
                            },
                        },
                        { $unwind: "$rr2" },
                        {
                            $lookup: {
                                from: "relatedmodel3",
                                localField: "rr3",
                                foreignField: "_id",
                                as: "rr3"
                            },
                        },
                        { $unwind: "$rr3" },
                    ]
                },
            },
            { $unwind: "$related" },
            {
                $lookup: {
                    from: "relatedmodel2",
                    localField: "related2",
                    foreignField: "_id",
                    as: "related2",
                    pipeline: [
                        {
                            $lookup: {
                                from: "relatedmodel4",
                                localField: "r4",
                                foreignField: "_id",
                                as: "r4"
                            },
                        },
                        { $unwind: "$r4" },
                    ]
                },
            },
            { $unwind: "$related2" },
        ]);
    });

    it("should create pipeline deep 1 recursive", async () => {
        const relatedSchema = new Schema(mongoose, {
            name: { type: String, required: true },
            related2: {
                type: mongoose.Schema.Types.ObjectId,
                ref: "RelatedModel2",
                required: true,
            },
        });
        const relatedSchema2 = new Schema(mongoose, {
            title: { type: String, required: true },
            related: {
                type: mongoose.Schema.Types.ObjectId,
                ref: "RelatedModel",
                required: true,
            },
        });

        const RelatedModel = Model(mongoose, "RelatedModel", relatedSchema);
        const RelatedModel2 = Model(mongoose, "RelatedModel2", relatedSchema2);
        await InitModels(client);

        const generator = new GenerateFoward({ stop: {
            collection: "",
            bruteForce: false
        }}, client);
        const pipeline = await generator.makeAggregate(RelatedModel);

        expect(pipeline).toMatchObject([
            {
                $lookup: {
                    from: "relatedmodel2",
                    localField: "related2",
                    foreignField: "_id",
                    as: "related2",
                },
            },
            { $unwind: "$related2" },
        ]);
    });

    it("should create pipeline deep 2 triple recursive", async () => {
        const relatedSchema2 = new Schema(mongoose, {
            name: { type: String, required: true },
            recursive: {
                type: mongoose.Schema.Types.ObjectId,
                ref: "RelatedModel",
                required: true,
            },
            recursive2: {
                type: mongoose.Schema.Types.ObjectId,
                ref: "RelatedModel",
                required: true,
            },
            recursive3: {
                type: mongoose.Schema.Types.ObjectId,
                ref: "RelatedModel",
                required: true,
            },
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

    it("should create pipeline deep 4 with diferrents fields away recursive", async () => {
        const relatedSchema4 = new Schema(mongoose, {
            name: { type: String, required: true },
            r2: {
                type: mongoose.Schema.Types.ObjectId,
                ref: "RelatedModel2",
                required: true,
            },
        });
        const relatedSchema3 = new Schema(mongoose, {
            name: { type: String, required: true },
        });
        const relatedSchema2 = new Schema(mongoose, {
            name: { type: String, required: true },
            r4: {
                type: mongoose.Schema.Types.ObjectId,
                ref: "RelatedModel4",
                required: true,
            },
        });
        const relatedSchema = new Schema(mongoose, {
            name: { type: String, required: true },
            rr2: {
                type: mongoose.Schema.Types.ObjectId,
                ref: "RelatedModel2",
                required: true,
            },
            rr3: {
                type: mongoose.Schema.Types.ObjectId,
                ref: "RelatedModel3",
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
                ref: "RelatedModel2",
                required: true,
            },
        });

        Model(mongoose, "RelatedModel4", relatedSchema4);
        Model(mongoose, "RelatedModel3", relatedSchema3);
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
                                localField: "rr2",
                                foreignField: "_id",
                                as: "rr2",
                                pipeline: [
                                    {
                                        $lookup: {
                                            from: "relatedmodel4",
                                            localField: "r4",
                                            foreignField: "_id",
                                            as: "r4"
                                        },
                                    },
                                    { $unwind: "$r4" },
                                ]
                            },
                        },
                        { $unwind: "$rr2" },
                        {
                            $lookup: {
                                from: "relatedmodel3",
                                localField: "rr3",
                                foreignField: "_id",
                                as: "rr3"
                            },
                        },
                        { $unwind: "$rr3" },
                    ]
                },
            },
            { $unwind: "$related" },
            {
                $lookup: {
                    from: "relatedmodel2",
                    localField: "related2",
                    foreignField: "_id",
                    as: "related2",
                    pipeline: [
                        {
                            $lookup: {
                                from: "relatedmodel4",
                                localField: "r4",
                                foreignField: "_id",
                                as: "r4"
                            },
                        },
                        { $unwind: "$r4" },
                    ]
                },
            },
            { $unwind: "$related2" },
        ]);
    });*/
});