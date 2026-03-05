import { ApolloServer } from '@apollo/server';
import { startStandaloneServer } from '@apollo/server/standalone';
import initSqlJs from 'sql.js';

const SQL = await initSqlJs();
const db = new SQL.Database();

db.run(`
  CREATE TABLE IF NOT EXISTS authors (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT,
    bio TEXT
  );
  CREATE TABLE IF NOT EXISTS posts (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT,
    content TEXT,
    authorId INTEGER,
    createdAt TEXT
  );
`);

db.run(`
  INSERT INTO authors (name, bio) VALUES ('Patrick', 'Dev backend PHP/Laravel');
  INSERT INTO posts (title, content, authorId, createdAt) 
    VALUES ('Primeiro post', 'Conteudo do primeiro post', 1, '2026-03-04');
`);

const typeDefs = `
  type Author {
    id: Int
    name: String
    bio: String
  }
  type Post {
    id: Int
    title: String
    content: String
    author: Author
    createdAt: String
  }
  type Query {
    posts: [Post]
    post(id: Int): Post
  }
  type Mutation {
    createPost(title: String, content: String, authorId: Int): Post
    deletePost(id: Int): Boolean
  }
`;

const resolvers = {
    Query: {
        posts: () => {
            const result = db.exec('SELECT * FROM posts');
            if (!result.length) return [];
            const [{ columns, values }] = result;
            return values.map(row =>
                Object.fromEntries(columns.map((col, i) => [col, row[i]]))
            );
        },
        post: (_, { id }) => {
            const result = db.exec(`SELECT * FROM posts WHERE id = ${id}`);
            if (!result.length) return null;
            const [{ columns, values }] = result;
            return Object.fromEntries(columns.map((col, i) => [col, values[0][i]]));
        },
    },
    Post: {
        author: (post) => {
            const result = db.exec(`SELECT * FROM authors WHERE id = ${post.authorId}`);
            if (!result.length) return null;
            const [{ columns, values }] = result;
            return Object.fromEntries(columns.map((col, i) => [col, values[0][i]]));
        },
    },
    Mutation: {
        createPost: (_, { title, content, authorId }) => {
            const createdAt = new Date().toISOString().split('T')[0];
            db.run(`INSERT INTO posts (title, content, authorId, createdAt) VALUES (?, ?, ?, ?)`,
                [title, content, authorId, createdAt]);
            const result = db.exec('SELECT * FROM posts ORDER BY id DESC LIMIT 1');
            const [{ columns, values }] = result;
            return Object.fromEntries(columns.map((col, i) => [col, values[0][i]]));
        },
        deletePost: (_, { id }) => {
            db.run(`DELETE FROM posts WHERE id = ${id}`);
            return true;
        },
    },
};

const server = new ApolloServer({ typeDefs, resolvers });

const { url } = await startStandaloneServer(server, {
    listen: { port: 4000 },
});

console.log(`Acessar ${url}`);