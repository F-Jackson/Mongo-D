import { describe, it, beforeEach, expect } from "vitest";
import mongoose from "mongoose";
import { cleanDb, disconnectDb } from "../utils.js";
import { InitModels, Model, Schema } from "../../src/index.js";
import { GenerateFoward } from "../../src/aggregateGenerator/foward.js";
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

        const r = await RelatedModel.create({ name: "Related" });
        const t = await TestModel.create({ name: "Test", related: r });
        const t2 = await TestModel.create({ name: "Test2", related: r });

        const aggregated = await TestModel.aggregate(pipeline);

        expect(aggregated).toMatchObject([
            {
                _id: t._id,
                __v: t.__v,
                name: 'Test',
                related: {
                    _id: r._id,
                    __v: r.__v,
                    name: "Related",
                }
            },
            {
                _id: t2._id,
                __v: t2.__v,
                name: 'Test2',
                related: {
                    _id: r._id,
                    __v: r.__v,
                    name: "Related",
                }
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

        const r2 = await RelatedModel2.create({ name: "Related2" });
        const r = await RelatedModel.create({ name: "Related", related2: r2 });
        const t = await TestModel.create({ name: "Test", related: r });
        const t2 = await TestModel.create({ name: "Test2", related: r });

        const aggregated = await TestModel.aggregate(pipeline);

        expect(aggregated).toMatchObject([
            {
                _id: t._id,
                __v: t.__v,
                name: 'Test',
                related: {
                    _id: r._id,
                    __v: r.__v,
                    name: "Related",
                    related2: {
                        _id: r2._id,
                        __v: r2.__v,
                        name: "Related2"
                    }
                }
            },
            {
                _id: t2._id,
                __v: t2.__v,
                name: 'Test2',
                related: {
                    _id: r._id,
                    __v: r.__v,
                    name: "Related",
                    related2: {
                        _id: r2._id,
                        __v: r2.__v,
                        name: "Related2"
                    }
                }
            },
        ]);
    });

    it("should create pipeline deep 1 triple", async () => {
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

        const r = await RelatedModel.create({ name: "Related" });
        const r2 = await RelatedModel.create({ name: "Related2" });
        const r3 = await RelatedModel.create({ name: "Related3" });
        const t = await TestModel.create({ name: "Test", related: r, related2: r2, related3: r3 });
        const t2 = await TestModel.create({ name: "Test2", related: r3, related2: r, related3: r2 });

        const aggregated = await TestModel.aggregate(pipeline);

        expect(aggregated).toMatchObject([
            {
                _id: t._id,
                __v: t.__v,
                name: 'Test',
                related: {
                    _id: r._id,
                    __v: r.__v,
                    name: "Related"
                },
                related2: {
                    _id: r2._id,
                    __v: r2.__v,
                    name: "Related2"
                },
                related3: {
                    _id: r3._id,
                    __v: r3.__v,
                    name: "Related3"
                },
            },
            {
                _id: t2._id,
                __v: t2.__v,
                name: 'Test2',
                related: {
                    _id: r3._id,
                    __v: r3.__v,
                    name: "Related3"
                },
                related2: {
                    _id: r._id,
                    __v: r.__v,
                    name: "Related"
                },
                related3: {
                    _id: r2._id,
                    __v: r2.__v,
                    name: "Related2"
                },
            },
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
            name: { type: String, required: true },
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

        const RelatedModel2 = Model(mongoose, "RelatedModel2", relatedSchema2);
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

        const r = await RelatedModel2.create({ name: "Related" });
        const r2 = await RelatedModel2.create({ name: "Related2" });
        const r3 = await RelatedModel2.create({ name: "Related3" });

        const rb = await RelatedModel.create({ name: "Related", rr: r, rr2: r2, rr3: r3 });
        const rb2 = await RelatedModel.create({ name: "Related2", rr: r, rr2: r3, rr3: r2 });
        const rb3 = await RelatedModel.create({ name: "Related3", rr: r3, rr2: r, rr3: r2 });

        const t = await TestModel.create({ name: "Test", related: rb, related2: rb2, related3: rb3 });
        const t2 = await TestModel.create({ name: "Test2", related: rb3, related2: rb, related3: rb2 });

        const aggregated = await TestModel.aggregate(pipeline);

        expect(aggregated).toMatchObject([
            {
                _id: t._id,
                __v: t.__v,
                name: 'Test',
                related: {
                    _id: rb._id,
                    __v: rb.__v,
                    name: "Related",
                    rr: {
                        _id: r._id,
                        __v: r.__v,
                        name: "Related",
                    },
                    rr2: {
                        _id: r2._id,
                        __v: r2.__v,
                        name: "Related2",
                    },
                    rr3: {
                        _id: r3._id,
                        __v: r3.__v,
                        name: "Related3",
                    }
                },
                related2: {
                    _id: rb2._id,
                    __v: rb2.__v,
                    name: "Related2",
                    rr: {
                        _id: r._id,
                        __v: r.__v,
                        name: "Related",
                    },
                    rr2: {
                        _id: r3._id,
                        __v: r3.__v,
                        name: "Related3",
                    },
                    rr3: {
                        _id: r2._id,
                        __v: r2.__v,
                        name: "Related2",
                    }
                },
                related3: {
                    _id: rb3._id,
                    __v: rb3.__v,
                    name: "Related3",
                    rr: {
                        _id: r3._id,
                        __v: r3.__v,
                        name: "Related3",
                    },
                    rr2: {
                        _id: r._id,
                        __v: r.__v,
                        name: "Related",
                    },
                    rr3: {
                        _id: r2._id,
                        __v: r2.__v,
                        name: "Related2",
                    }
                },
            },
            {
                _id: t2._id,
                __v: t2.__v,
                name: 'Test2',
                related: {
                    _id: rb3._id,
                    __v: rb3.__v,
                    name: "Related3",
                    rr: {
                        _id: r3._id,
                        __v: r3.__v,
                        name: "Related3",
                    },
                    rr2: {
                        _id: r._id,
                        __v: r.__v,
                        name: "Related",
                    },
                    rr3: {
                        _id: r2._id,
                        __v: r2.__v,
                        name: "Related2",
                    }
                },
                related2: {
                    _id: rb._id,
                    __v: rb.__v,
                    name: "Related",
                    rr: {
                        _id: r._id,
                        __v: r.__v,
                        name: "Related",
                    },
                    rr2: {
                        _id: r2._id,
                        __v: r2.__v,
                        name: "Related2",
                    },
                    rr3: {
                        _id: r3._id,
                        __v: r3.__v,
                        name: "Related3",
                    }
                },
                related3: {
                    _id: rb2._id,
                    __v: rb2.__v,
                    name: "Related2",
                    rr: {
                        _id: r._id,
                        __v: r.__v,
                        name: "Related",
                    },
                    rr2: {
                        _id: r3._id,
                        __v: r3.__v,
                        name: "Related3",
                    },
                    rr3: {
                        _id: r2._id,
                        __v: r2.__v,
                        name: "Related2",
                    }
                },
            },
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
            name: { type: String, required: true },
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

        const RelatedModel4 = Model(mongoose, "RelatedModel4", relatedSchema4);
        const RelatedModel3 = Model(mongoose, "RelatedModel3", relatedSchema3);
        const RelatedModel2 = Model(mongoose, "RelatedModel2", relatedSchema2);
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

        const r4 = await RelatedModel4.create({ name: "Related4" });
        const rb4 = await RelatedModel4.create({ name: "Related4B" });
        const r3 = await RelatedModel3.create({ name: "Related3" });
        const r2 = await RelatedModel2.create({ name: "Related2", r4: r4 });
        const rb2 = await RelatedModel2.create({ name: "Related2B", r4: rb4 });
        const r = await RelatedModel.create({ name: "Related", rr2: r2, rr3: r3 });

        const t = await TestModel.create({ name: "Test", related: r, related2: r2});
        const t2 = await TestModel.create({ name: "Test2", related: r, related2: rb2 });

        const aggregated = await TestModel.aggregate(pipeline);

        expect(aggregated).toMatchObject([
            {
                _id: t._id,
                __v: t.__v,
                name: 'Test',
                related: {
                    _id: r._id,
                    __v: r.__v,
                    name: "Related",
                    rr2: {
                        _id: r2._id,
                        __v: r2.__v,
                        name: "Related2",
                        r4: {
                            _id: r4._id,
                            __v: r4.__v,
                            name: "Related4",
                        }
                    }, 
                    rr3: {
                        _id: r3._id,
                        __v: r3.__v,
                        name: "Related3",
                    }
                },
                related2: {
                    _id: r2._id,
                    __v: r2.__v,
                    name: "Related2",
                    r4: {
                        _id: r4._id,
                        __v: r4.__v,
                        name: "Related4",
                    }
                }
            },
            {
                _id: t2._id,
                __v: t2.__v,
                name: 'Test2',
                related: {
                    _id: r._id,
                    __v: r.__v,
                    name: "Related",
                    rr2: {
                        _id: r2._id,
                        __v: r2.__v,
                        name: "Related2",
                        r4: {
                            _id: r4._id,
                            __v: r4.__v,
                            name: "Related4",
                        }
                    }, 
                    rr3: {
                        _id: r3._id,
                        __v: r3.__v,
                        name: "Related3",
                    }
                },
                related2: {
                    _id: rb2._id,
                    __v: rb2.__v,
                    name: "Related2B",
                    r4: {
                        _id: rb4._id,
                        __v: rb4.__v,
                        name: "Related4B",
                    }
                }
            }
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
            name: { type: String, required: true },
            related: {
                type: mongoose.Schema.Types.ObjectId,
                ref: "RelatedModel"
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

        const r = await RelatedModel2.create({ name: "RelatedM" });
        const rr = await RelatedModel.create({ name: "Related", related2: r });
        const rr2 = await RelatedModel.create({ name: "Related2", related2: r });
        r.related = rr;
        await r.save();

        const aggregated = await RelatedModel.aggregate(pipeline);

        expect(aggregated).toMatchObject([
            {
                _id: rr._id,
                __v: rr.__v,
                name: 'Related',
                related2: {
                    _id: r._id,
                    __v: r.__v,
                    name: "RelatedM",
                    related: {
                        _id: rr._id,
                        __v: rr.__v,
                        name: "Related",
                    }
                }
            },
            {
                _id: rr2._id,
                __v: rr2.__v,
                name: 'Related2',
                related2: {
                    _id: r._id,
                    __v: r.__v,
                    name: "RelatedM",
                    related: {
                        _id: rr._id,
                        __v: rr.__v,
                        name: "Related",
                    }
                }
            }
        ]);
    });

    it("should create pipeline deep 2 triple recursive", async () => {
        const relatedSchema2 = new Schema(mongoose, {
            name: { type: String, required: true },
            recursive: {
                type: mongoose.Schema.Types.ObjectId,
                ref: "RelatedModel",
            },
            recursive2: {
                type: mongoose.Schema.Types.ObjectId,
                ref: "RelatedModel",
            },
            recursive3: {
                type: mongoose.Schema.Types.ObjectId,
                ref: "RelatedModel",
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
            name: { type: String, required: true },
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

        const RelatedModel2 = Model(mongoose, "RelatedModel2", relatedSchema2);
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

        const r = await RelatedModel2.create({ name: "RelatedM" });
        const r2 = await RelatedModel2.create({ name: "RelatedM2" });
        const r3 = await RelatedModel2.create({ name: "RelatedM3" });

        const rr = await RelatedModel.create({ name: "Related", rr: r, rr2: r2, rr3: r3 });
        const rr2 = await RelatedModel.create({ name: "Related2", rr: r3, rr2: r, rr3: r2 });
        const rr3 = await RelatedModel.create({ name: "Related3", rr: r2, rr2: r3, rr3: r });

        r.recursive = rr;
        r.recursive2 = rr2;
        r.recursive3 = rr3;
        await r.save();

        r2.recursive = rr2;
        r2.recursive2 = rr3;
        r2.recursive3 = rr;
        await r2.save();

        r3.recursive = rr3;
        r3.recursive2 = rr;
        r3.recursive3 = rr2;
        await r3.save();

        const t = await TestModel.create({ name: "Test", related: rr, related2: rr2, related3: rr3 });
        const t2 = await TestModel.create({ name: "Test2", related: rr2, related2: rr3, related3: rr });

        const aggregated = await TestModel.aggregate(pipeline);   

        expect(aggregated).toMatchObject([
            {
                _id: t._id,
                __v: t.__v,
                name: 'Test',
                related: {
                    _id: rr._id,
                    __v: rr.__v,
                    name: "Related",
                    rr: {
                        _id: r._id,
                        __v: r.__v,
                        name: "RelatedM",
                        recursive: rr._id,
                        recursive2: rr2._id,
                        recursive3: rr3._id
                    },
                    rr2: {
                        _id: r2._id,
                        __v: r2.__v,
                        name: "RelatedM2",
                        recursive: rr2._id,
                        recursive2: rr3._id,
                        recursive3: rr._id
                    },
                    rr3: {
                        _id: r3._id,
                        __v: r3.__v,
                        name: "RelatedM3",
                        recursive: rr3._id,
                        recursive2: rr._id,
                        recursive3: rr2._id
                    },
                },
                related2: {
                    _id: rr2._id,
                    __v: rr2.__v,
                    name: "Related2",
                    rr: {
                        _id: r3._id,
                        __v: r3.__v,
                        name: "RelatedM3",
                        recursive: rr3._id,
                        recursive2: rr._id,
                        recursive3: rr2._id
                    },
                    rr2: {
                        _id: r._id,
                        __v: r.__v,
                        name: "RelatedM",
                        recursive: rr._id,
                        recursive2: rr2._id,
                        recursive3: rr3._id
                    },
                    rr3: {
                        _id: r2._id,
                        __v: r2.__v,
                        name: "RelatedM2",
                        recursive: rr2._id,
                        recursive2: rr3._id,
                        recursive3: rr._id
                    },
                },
                related3: {
                    _id: rr3._id,
                    __v: rr3.__v,
                    name: "Related3",
                    rr: {
                        _id: r2._id,
                        __v: r2.__v,
                        name: "RelatedM2",
                        recursive: rr2._id,
                        recursive2: rr3._id,
                        recursive3: rr._id
                    },
                    rr2: {
                        _id: r3._id,
                        __v: r3.__v,
                        name: "RelatedM3",
                        recursive: rr3._id,
                        recursive2: rr._id,
                        recursive3: rr2._id
                    },
                    rr3: {
                        _id: r._id,
                        __v: r.__v,
                        name: "RelatedM",
                        recursive: rr._id,
                        recursive2: rr2._id,
                        recursive3: rr3._id
                    },
                }
            },
            {
                _id: t2._id,
                __v: t2.__v,
                name: 'Test2',
                related: {
                    _id: rr2._id,
                    __v: rr2.__v,
                    name: "Related2",
                    rr: {
                        _id: r3._id,
                        __v: r3.__v,
                        name: "RelatedM3",
                        recursive: rr3._id,
                        recursive2: rr._id,
                        recursive3: rr2._id
                    },
                    rr2: {
                        _id: r._id,
                        __v: r.__v,
                        name: "RelatedM",
                        recursive: rr._id,
                        recursive2: rr2._id,
                        recursive3: rr3._id
                    },
                    rr3: {
                        _id: r2._id,
                        __v: r2.__v,
                        name: "RelatedM2",
                        recursive: rr2._id,
                        recursive2: rr3._id,
                        recursive3: rr._id
                    },
                },
                related2: {
                    _id: rr3._id,
                    __v: rr3.__v,
                    name: "Related3",
                    rr: {
                        _id: r2._id,
                        __v: r2.__v,
                        name: "RelatedM2",
                        recursive: rr2._id,
                        recursive2: rr3._id,
                        recursive3: rr._id
                    },
                    rr2: {
                        _id: r3._id,
                        __v: r3.__v,
                        name: "RelatedM3",
                        recursive: rr3._id,
                        recursive2: rr._id,
                        recursive3: rr2._id
                    },
                    rr3: {
                        _id: r._id,
                        __v: r.__v,
                        name: "RelatedM",
                        recursive: rr._id,
                        recursive2: rr2._id,
                        recursive3: rr3._id
                    },
                },
                related3: {
                    _id: rr._id,
                    __v: rr.__v,
                    name: "Related",
                    rr: {
                        _id: r._id,
                        __v: r.__v,
                        name: "RelatedM",
                        recursive: rr._id,
                        recursive2: rr2._id,
                        recursive3: rr3._id
                    },
                    rr2: {
                        _id: r2._id,
                        __v: r2.__v,
                        name: "RelatedM2",
                        recursive: rr2._id,
                        recursive2: rr3._id,
                        recursive3: rr._id
                    },
                    rr3: {
                        _id: r3._id,
                        __v: r3.__v,
                        name: "RelatedM3",
                        recursive: rr3._id,
                        recursive2: rr._id,
                        recursive3: rr2._id
                    },
                }
            },
        ]);
    });

    it("should create pipeline deep 4 with diferrents fields away recursive", async () => {
        const relatedSchema4 = new Schema(mongoose, {
            name: { type: String, required: true },
            r: {
                type: mongoose.Schema.Types.ObjectId,
                ref: "RelatedModel",
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
            r2: {
                type: mongoose.Schema.Types.ObjectId,
                ref: "RelatedModel2",
                required: true,
            },
            r3: {
                type: mongoose.Schema.Types.ObjectId,
                ref: "RelatedModel3",
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
            related2: {
                type: mongoose.Schema.Types.ObjectId,
                ref: "RelatedModel2",
                required: true,
            },
        });

        const RelatedModel4 = Model(mongoose, "RelatedModel4", relatedSchema4);
        const RelatedModel3 = Model(mongoose, "RelatedModel3", relatedSchema3);
        const RelatedModel2 = Model(mongoose, "RelatedModel2", relatedSchema2);
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

        const rd = await RelatedModel4.create({ name: "RelatedD" });
        const rd2 = await RelatedModel4.create({ name: "RelatedD2" });
        const rd3 = await RelatedModel4.create({ name: "RelatedD3" });

        const rc = await RelatedModel3.create({ name: "RelatedC" });
        const rc2 = await RelatedModel3.create({ name: "RelatedC2" });
        const rc3 = await RelatedModel3.create({ name: "RelatedC3" });

        const rb = await RelatedModel2.create({ name: "RelatedB", r4: rd });
        const rb2 = await RelatedModel2.create({ name: "RelatedB2", r4: rd2 });
        const rb3 = await RelatedModel2.create({ name: "RelatedB3", r4: rd3 });

        const r = await RelatedModel.create({ name: "Related", r2: rb, r3: rc });
        const r2 = await RelatedModel.create({ name: "Related2", r2: rb2, r3: rc2 });
        const r3 = await RelatedModel.create({ name: "Related3", r2: rb3, r3: rc3 });

        rd.r = r;
        await rd.save();

        rd2.r = r2;
        await rd2.save();

        rd3.r = r3;
        await rd3.save();

        const t = await TestModel.create({ name: "Test", related: r, related2: rb });
        const t2 = await TestModel.create({ name: "Test2", related: r2, related2: rb2 });

        const aggregated = await TestModel.aggregate(pipeline);   
        console.log(aggregated)

        expect(aggregated).toMatchObject([
            {
                _id: t._id,
                __v: t.__v,
                name: 'Test',
                
            },
        ]);
    });
});