declare module '@fjackson/mongo-d' {
    import mongoose from 'mongoose';

    export class Schema extends mongoose.Schema {
        constructor(obj: Record<string, any>, options?: mongoose.SchemaOptions);
    }

    export const Model: (
        name: string,
        schema: mongoose.Schema,
        collection?: string,
        options?: mongoose.ModelOptions
    ) => mongoose.Model<any, unknown, unknown, unknown, any, any>;

    export const InitModels: (
        client: typeof mongoose,
        __mocks?: Record<string, any>
    ) => Promise<void>;
}
