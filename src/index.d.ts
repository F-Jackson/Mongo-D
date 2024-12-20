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

    export interface ExtendedModel<T = any> extends mongoose.Model<T> {
        Create: (doc: T, checkExistence?: boolean, callback?: mongoose.Callback) => Promise<T>;
        Delete: (conditions: any, options?: any) => Promise<any>;
    }

    export const Model: (
        mongoose: typeof mongoose,
        name: string,
        schema: mongoose.Schema,
        collection?: string,
        options?: mongoose.ModelOptions
    ) => ExtendedModel;

    export const InitModels: (
        client: typeof mongoose
    ) => Promise<void>;
}
