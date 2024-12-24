import { describe, it, beforeEach, expect } from "vitest";
import { cleanDb, disconnectDb } from "./utils.js";
import { InitModels, Model, Schema } from "../src/index.js";
import mongoose from "mongoose";
import { aggregateFks2 } from "../src/deletion.js";
import { pipeline } from "stream";

describe("Mongo model Delete", () => {
    let client;

    beforeEach(async () => {
        client = await cleanDb();
    }, 0);

    afterEach(async () => {
        await disconnectDb(client);
    }, 0);

    /*it("should delete with required", async () => {
        const relatedSchema = new Schema(mongoose, {
            title: { type: String, required: true },
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
        const [ deletedCount, relatedCount, records ] = await RelatedModel.Delete({ _id: related._id });

        expect(deletedCount).toEqual(1);
        expect(relatedCount).toEqual(2);
        expect(records["TestModel"].excluded).toHaveLength(2);

        const testes = await TestModel.find({});
        expect(testes).toHaveLength(0);

        const relateds = await RelatedModel.find({});
        expect(relateds).toHaveLength(0);
    }, 0);*/

    it("should delete deep 3 with required", async () => {
        const relatedSchema4 = new Schema(mongoose, {
            title: { type: String, required: true },
            
        });
        const relatedSchema3 = new Schema(mongoose, {
            title: { type: String, required: true },
            related4: {
                type: mongoose.Schema.Types.ObjectId,
                ref: "RelatedModel4",
                required: true,
            },
        });
        const relatedSchema2 = new Schema(mongoose, {
            title: { type: String, required: true },
            related3: {
                type: mongoose.Schema.Types.ObjectId,
                ref: "RelatedModel3",
                required: true,
            },
            related3B: {
                type: mongoose.Schema.Types.ObjectId,
                ref: "RelatedModel3",
                required: true,
            },
        });
        const relatedSchema = new Schema(mongoose, {
            title: { type: String, required: true },
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

        const RelatedModel = Model(mongoose, "RelatedModel", relatedSchema);
        const RelatedModel2 = Model(mongoose, "RelatedModel2", relatedSchema2);
        const RelatedModel3 = Model(mongoose, "RelatedModel3", relatedSchema3);
        const RelatedModel4 = Model(mongoose, "RelatedModel4", relatedSchema4);
        const TestModel = Model(mongoose, "TestModel", testSchema);

        await InitModels(client);

        const related4B = await RelatedModel4.Create({ title: "Related4B" });
        const related3B = await RelatedModel3.Create({ title: "Related3B", related4: related4B });

        const related4 = await RelatedModel4.Create({ title: "Related4" });
        const related3 = await RelatedModel3.Create({ title: "Related3", related4: related4 });

        const related2B = await RelatedModel2.Create({
            title: "Related2B",
            related3: related3._id,
            related3B: related3B._id
        });

        const related2 = await RelatedModel2.Create({ title: "Related2", related3: related3, related3B: related3B });

        const related = await RelatedModel.Create({
            title: "Related",
            related2: related2,
            related2B: related2B, // Certifique-se de passar o `_id`
        });        

        const relatedB = await RelatedModel.Create({ title: "RelatedB", related2: related2B });

        const tests = await TestModel.Create([
            { 
                name: "Test", 
                related: related
            },
            { 
                name: "Test2", 
                related: related
            },
            { 
                name: "Test3", 
                related: relatedB
            }
        ]);

        const results = await RelatedModel4.aggregate([
            {
                $lookup: {
                    from: "relatedmodel3", // Nome da coleção MongoDB, em minúsculas
                    localField: "_id", // Campo local no schema RelatedModel2
                    foreignField: "related4", // Campo _id em RelatedModel3
                    as: "related3", // Nome do array de resultados,
                    pipeline: [
                        {
                            $project: {
                                related4: 0,
                            }
                        },
                        {
                            $lookup: {
                                from: "relatedmodel2", // Nome da coleção MongoDB, em minúsculas
                                localField: "_id", // Campo local no schema RelatedModel2
                                foreignField: "related3", // Campo _id em RelatedModel3
                                as: "related2", // Nome do array de resultados
                            },
                        },
                        {
                            $unwind: "$related2", // Desaninha o array relatedmodel3
                        },
                    ]
                },
            },
            {
                $unwind: "$related3", // Desaninha o array relatedmodel3
            },
            /*{
                $lookup: {
                    from: "relatedmodel3", // Nome da coleção MongoDB, em minúsculas
                    localField: "related3B", // Campo local no schema RelatedModel2
                    foreignField: "_id", // Campo _id em RelatedModel3
                    as: "relatedmodel3B", // Nome do array de resultados
                },
            },
            {
                $unwind: "$relatedmodel3B", // Desaninha o array relatedmodel3
            },*/
            {
                $addFields: {
                    "__FKS__": {
                        related3: {
                            $mergeObjects: [
                                "$related3", // Dados de relatedmodel3
                                { related4: "$related2" }, // Anexa relatedmodel4 como related4 dentro de related3
                            ],
                        },
                    },
                },
            },
            {
                $project: {
                    related3: 0, // Remove o campo relacionado original
                    related2: 0, // Remove o campo relacionado original
                },
            },
        ]);        
        
        
        
        const util = require('util');
        console.log(util.inspect(results, { showHidden: false, depth: null, colors: true }));

        /*
            {
                $match: {
                  "testDetails._id": tests[0]._id, // Filtra pelo `_id` de TestModel
                },
            },
            {
                $project: {
                    _id: 1,
                    relatedData: 1,
                    testDetails: 1,
                    related3Data: 1,
                    related4Data: 1
                },
            }
        */

        /*const m = await aggregateFks2(RelatedModel, mongoose);
        const util = require('util');
        const g = await RelatedModel.aggregate(m);
        console.log(JSON.stringify(g));
        console.log(util.inspect(m, { showHidden: false, depth: null, colors: true }));*/


        //console.log(trueResults);
        //console.log(JSON.stringify(results));
        //await aggregate("RelatedModel", mongoose);

        return;
        const [ deletedCount, relatedCount, records ] = await RelatedModel3.Delete({ _id: related3._id });

        const testes = await TestModel.find({});
        expect(testes).toHaveLength(0);
        const relateds = await RelatedModel.find({});
        expect(relateds).toHaveLength(0);
        const relateds2 = await RelatedModel2.find({});
        expect(relateds2).toHaveLength(0);
        const relateds3 = await RelatedModel3.find({});
        expect(relateds3).toHaveLength(0);

        expect(deletedCount).toEqual(1);
        expect(relatedCount).toEqual(4);
        expect(Object.entries(records)).toHaveLength(3);
    }, 0);

    /*it("should nested delete with required", async () => {
        const relatedSchema = new Schema(mongoose, {
            title: { type: String, required: true },
        });
        const testSchema = new Schema(mongoose, {
            name: { type: String, required: true },
            nested: {
                related: {
                    type: mongoose.Schema.Types.ObjectId,
                    ref: "RelatedModel",
                    required: true,
                }
            },
        });

        const RelatedModel = Model(mongoose, "RelatedModel", relatedSchema);
        const TestModel = Model(mongoose, "TestModel", testSchema);

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
        const [ deletedCount, relatedCount, records ] = await RelatedModel.Delete({ _id: related._id });

        expect(deletedCount).toEqual(1);
        expect(relatedCount).toEqual(2);
        expect(records["TestModel"].excluded).toHaveLength(2);

        const testes = await TestModel.find({});
        expect(testes).toHaveLength(0);

        const relateds = await RelatedModel.find({});
        expect(relateds).toHaveLength(0);
    }, 0);

    it("should array delete with required", async () => {
        const relatedSchema = new Schema(mongoose, {
            title: { type: String, required: true },
        });
        const testSchema = new Schema(mongoose, {
            name: { type: String, required: true },
            related: {
                type: [ mongoose.Schema.Types.ObjectId ],
                ref: "RelatedModel",
                required: true,
            },
        });

        const RelatedModel = Model(mongoose, "RelatedModel", relatedSchema);
        const TestModel = Model(mongoose, "TestModel", testSchema);

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

        const [ deletedCount, relatedCount, records ] = await RelatedModel.Delete({ _id: related._id });

        expect(deletedCount).toEqual(1);
        expect(relatedCount).toEqual(2);
        expect(records["TestModel"].updated).toHaveLength(2);

        const testes = await TestModel.find({});
        expect(testes).toHaveLength(2);
        expect(testes[0].related).toHaveLength(2);
        expect(testes[1].related).toHaveLength(2);

        const relateds = await RelatedModel.find({});
        expect(relateds).toHaveLength(2);
    }, 0);

    it("should delete without required", async () => {
        const relatedSchema = new Schema(mongoose, {
            title: { type: String, required: true },
        });
        const testSchema = new Schema(mongoose, {
            name: { type: String, required: true },
            related: {
                type: mongoose.Schema.Types.ObjectId,
                ref: "RelatedModel",
            },
        });

        const RelatedModel = Model(mongoose, "RelatedModel", relatedSchema);
        const TestModel = Model(mongoose, "TestModel", testSchema);

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

        const [ deletedCount, relatedCount, records ] = await RelatedModel.Delete({ _id: related._id });

        expect(deletedCount).toEqual(1);
        expect(relatedCount).toEqual(2);
        expect(records["TestModel"].updated).toHaveLength(2);

        const testes = await TestModel.find({});
        expect(testes).toHaveLength(2);
        expect(testes[0].related).toBeNull();
        expect(testes[1].related).toBeNull();

        const relateds = await RelatedModel.find({});
        expect(relateds).toHaveLength(0);
    }, 0);

    it("should nested delete without required", async () => {
        const relatedSchema = new Schema(mongoose, {
            title: { type: String, required: true },
        });
        const testSchema = new Schema(mongoose, {
            name: { type: String, required: true },
            nested: {
                related: {
                    type: mongoose.Schema.Types.ObjectId,
                    ref: "RelatedModel",
                }
            },
        });

        const RelatedModel = Model(mongoose, "RelatedModel", relatedSchema);
        const TestModel = Model(mongoose, "TestModel", testSchema);

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

        const [ deletedCount, relatedCount, records ] = await RelatedModel.Delete({ _id: related._id });

        expect(deletedCount).toEqual(1);
        expect(relatedCount).toEqual(2);
        expect(records["TestModel"].updated).toHaveLength(2);

        const testes = await TestModel.find({});
        expect(testes).toHaveLength(2);
        expect(testes[0].nested.related).toBeNull();
        expect(testes[1].nested.related).toBeNull();

        const relateds = await RelatedModel.find({});
        expect(relateds).toHaveLength(0);
    }, 0);

    it("should array delete without required", async () => {
        const relatedSchema = new Schema(mongoose, {
            title: { type: String, required: true },
        });
        const testSchema = new Schema(mongoose, {
            name: { type: String, required: true },
            related: {
                type: [ mongoose.Schema.Types.ObjectId ],
                ref: "RelatedModel",
            },
        });

        const RelatedModel = Model(mongoose, "RelatedModel", relatedSchema);
        const TestModel = Model(mongoose, "TestModel", testSchema);

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

        const [ deletedCount, relatedCount, records ] = await RelatedModel.Delete({ _id: related._id });

        expect(deletedCount).toEqual(1);
        expect(relatedCount).toEqual(2);
        expect(records["TestModel"].updated).toHaveLength(2);

        const testes = await TestModel.find({});
        expect(testes).toHaveLength(2);
        expect(testes[0].related).toHaveLength(2);
        expect(testes[1].related).toHaveLength(2);

        const relateds = await RelatedModel.find({});
        expect(relateds).toHaveLength(2);
    }, 0);

    it("should delete with immutable and delete", async () => {
        const relatedSchema = new Schema(mongoose, {
            title: { type: String, required: true },
        });
        const testSchema = new Schema(mongoose, {
            name: { type: String, required: true },
            related: {
                type: mongoose.Schema.Types.ObjectId,
                ref: "RelatedModel",
                immutable: true,
            },
        });

        const RelatedModel = Model(mongoose, "RelatedModel", relatedSchema);
        const TestModel = Model(mongoose, "TestModel", testSchema);

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

        const [ deletedCount, relatedCount, records ] = await RelatedModel.Delete({ _id: related._id });

        expect(deletedCount).toEqual(1);
        expect(relatedCount).toEqual(2);
        expect(records["TestModel"].excluded).toHaveLength(2);

        const testes = await TestModel.find({});
        expect(testes).toHaveLength(0);

        const relateds = await RelatedModel.find({});
        expect(relateds).toHaveLength(0);
    }, 0);

    it("should nested delete with immutable and delete", async () => {
        const relatedSchema = new Schema(mongoose, {
            title: { type: String, required: true },
        });
        const testSchema = new Schema(mongoose, {
            name: { type: String, required: true },
            nested: {
                related: {
                    type: mongoose.Schema.Types.ObjectId,
                    ref: "RelatedModel",
                    immutable: true
                }
            },
        });

        const RelatedModel = Model(mongoose, "RelatedModel", relatedSchema);
        const TestModel = Model(mongoose, "TestModel", testSchema);

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

        const [ deletedCount, relatedCount, records ] = await RelatedModel.Delete({ _id: related._id });

        expect(deletedCount).toEqual(1);
        expect(relatedCount).toEqual(2);
        expect(records["TestModel"].excluded).toHaveLength(2);

        const testes = await TestModel.find({});
        expect(testes).toHaveLength(0);

        const relateds = await RelatedModel.find({});
        expect(relateds).toHaveLength(0);
    }, 0);

    it("should array delete with immutable and delete", async () => {
        const relatedSchema = new Schema(mongoose, {
            title: { type: String, required: true },
        });
        const testSchema = new Schema(mongoose, {
            name: { type: String, required: true },
            related: {
                type: [ mongoose.Schema.Types.ObjectId ],
                ref: "RelatedModel",
                immutable: true
            },
        });

        const RelatedModel = Model(mongoose, "RelatedModel", relatedSchema);
        const TestModel = Model(mongoose, "TestModel", testSchema);

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
        const relatedSchema = new Schema(mongoose, {
            title: { type: String, required: true },
        });
        const testSchema = new Schema(mongoose, {
            name: { type: String, required: true },
            nested: {
                related: {
                    type: mongoose.Schema.Types.ObjectId,
                    ref: "RelatedModel",
                    immutable: true
                }
            },
        });

        const RelatedModel = Model(mongoose, "RelatedModel", relatedSchema);
        const TestModel = Model(mongoose, "TestModel", testSchema);

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

        const [ deletedCount, relatedCount, records ] = await RelatedModel.Delete({ _id: related._id }, "keep");

        expect(deletedCount).toEqual(1);
        expect(relatedCount).toEqual(2);
        expect(records["TestModel"].updated).toHaveLength(2);

        const testes = await TestModel.find({});
        expect(testes).toHaveLength(2);
        expect(testes[0].nested.related).toBeTruthy();
        expect(testes[1].nested.related).toBeTruthy();

        const relateds = await RelatedModel.find({});
        expect(relateds).toHaveLength(0);
    }, 0);

    it("should nested delete with immutable and delete", async () => {
        const relatedSchema = new Schema(mongoose, {
            title: { type: String, required: true },
        });
        const testSchema = new Schema(mongoose, {
            name: { type: String, required: true },
            nested: {
                related: {
                    type: mongoose.Schema.Types.ObjectId,
                    ref: "RelatedModel",
                    immutable: true
                }
            },
        });

        const RelatedModel = Model(mongoose, "RelatedModel", relatedSchema);
        const TestModel = Model(mongoose, "TestModel", testSchema);

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

        const [ deletedCount, relatedCount, records ] = await RelatedModel.Delete({ _id: related._id }, "keep");

        expect(deletedCount).toEqual(1);
        expect(relatedCount).toEqual(2);
        expect(records["TestModel"].updated).toHaveLength(2);

        const testes = await TestModel.find({});
        expect(testes).toHaveLength(2);
        expect(testes[0].nested.related).toBeTruthy();
        expect(testes[1].nested.related).toBeTruthy();

        const relateds = await RelatedModel.find({});
        expect(relateds).toHaveLength(0);
    }, 0);

    it("should array delete with immutable and keep", async () => {
        const relatedSchema = new Schema(mongoose, {
            title: { type: String, required: true },
        });
        const testSchema = new Schema(mongoose, {
            name: { type: String, required: true },
            related: {
                type: [ mongoose.Schema.Types.ObjectId ],
                ref: "RelatedModel",
                immutable: true
            },
        });

        const RelatedModel = Model(mongoose, "RelatedModel", relatedSchema);
        const TestModel = Model(mongoose, "TestModel", testSchema);

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
        const relatedSchema = new Schema(mongoose, {
            title: { type: String, required: true },
        });
        const testSchema = new Schema(mongoose, {
            name: { type: String, required: true },
            nested: {
                related: {
                    type: [ mongoose.Schema.Types.ObjectId ],
                    ref: "RelatedModel",
                    required: true,
                }
            },
        });

        const RelatedModel = Model(mongoose, "RelatedModel", relatedSchema);
        const TestModel = Model(mongoose, "TestModel", testSchema);

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

        const [ deletedCount, relatedCount, records ] = await RelatedModel.Delete({ _id: related._id });

        expect(deletedCount).toEqual(1);
        expect(relatedCount).toEqual(2);
        expect(records["TestModel"].updated).toHaveLength(2);

        const testes = await TestModel.find({});
        expect(testes).toHaveLength(2);
        expect(testes[0].nested.related).toHaveLength(2);
        expect(testes[1].nested.related).toHaveLength(2);

        const relateds = await RelatedModel.find({});
        expect(relateds).toHaveLength(2);
    }, 0);*/
}, 0);