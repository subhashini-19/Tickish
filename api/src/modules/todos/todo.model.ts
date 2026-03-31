import mongoose, { Document, Schema } from 'mongoose';

// TypeScript interface — defines the shape of a Todo document
export interface ITodo extends Document {
  userId: string;       // the Entra object ID from the JWT — scopes todos to the logged-in user
  title: string;
  description?: string;
  completed: boolean;
  priority: 'low' | 'medium' | 'high';
  dueDate?: Date;
  tags: string[];
  createdAt: Date;
  updatedAt: Date;
}

const TodoSchema = new Schema<ITodo>(
  {
    userId: { type: String, required: true, index: true }, // indexed — every query filters by userId
    title: { type: String, required: true, trim: true, maxlength: 200 },
    description: { type: String, trim: true, maxlength: 1000 },
    completed: { type: Boolean, default: false },
    priority: { type: String, enum: ['low', 'medium', 'high'], default: 'medium' },
    dueDate: { type: Date },
    tags: [{ type: String, trim: true }],
  },
  {
    timestamps: true, // automatically manages createdAt and updatedAt
  }
);

export const Todo = mongoose.model<ITodo>('Todo', TodoSchema);
