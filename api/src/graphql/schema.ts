export const typeDefs = `#graphql

  # The schema is the contract between client and server.
  # Unlike REST where the shape is implicit, GraphQL makes it explicit and self-documenting.

  enum Priority {
    low
    medium
    high
  }

  type Todo {
    id: ID!
    userId: String!
    title: String!
    description: String
    completed: Boolean!
    priority: Priority!
    dueDate: String
    tags: [String!]!
    createdAt: String!
    updatedAt: String!
  }

  # Dashboard aggregate — one GraphQL query replaces multiple REST calls
  type TodoSummary {
    total: Int!
    completed: Int!
    pending: Int!
    byPriority: PriorityBreakdown!
  }

  type PriorityBreakdown {
    low: Int!
    medium: Int!
    high: Int!
  }

  # Input types are GraphQL's equivalent of DTOs — used for mutations
  input CreateTodoInput {
    title: String!
    description: String
    priority: Priority
    dueDate: String
    tags: [String!]
  }

  input UpdateTodoInput {
    title: String
    description: String
    completed: Boolean
    priority: Priority
    dueDate: String
    tags: [String!]
  }

  # Queries = reads, Mutations = writes (same as GET vs POST/PATCH/DELETE in REST)
  type Query {
    todos(completed: Boolean, priority: Priority, tag: String): [Todo!]!
    todo(id: ID!): Todo
    todoSummary: TodoSummary!
  }

  type Mutation {
    createTodo(input: CreateTodoInput!): Todo!
    updateTodo(id: ID!, input: UpdateTodoInput!): Todo!
    deleteTodo(id: ID!): Boolean!
    bulkCompleteTodos(ids: [ID!]!): Int!
  }
`;
