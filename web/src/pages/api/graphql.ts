/**
 * GraphQLのエンドポイント
 */

import {ApolloServer, gql} from 'apollo-server-micro';
import { PageConfig } from 'next';
import Cors from 'micro-cors';

const cors = Cors();

// next.jsのパーサーを停止する
export const config:PageConfig = {
    api: {
      bodyParser: false,
    },
};

/*
    type Repository {
        owner: String,
        repo: String,
        branches: [String]!,
        defaultBranch: String,
    },
    type Branch {
        name: String,
        files: [File]!
    }
    type File {
        name: String,
        type : String, // 'file','dir'
    }
    type Theme {
        name: String,
    }
 
 */

const typeDefs = gql`
  type Query {
    users: [User!]!,
    themes: [Theme!]!
  }
  type User {
    name: String
  },
  type Theme {
    name: String,
    style: String
  }
`;

const resolvers = {
  Query: {
    // parent  前のリゾルバ呼び出しの結果
    // args    リゾルバのフィールドの引数
    // context 各リゾルバが読み書きできるカスタムオブジェクト
    users(parent: {}, args: {}, context: {}) {
        console.log('parent', parent);
        console.log('args', args);
        console.log('context', context);
      return [{name: 'name1'}, {name: 'name2'}];
    },
    themes(parent: {}, args: {}, context: {}){
        return [{name:'theme1',style:'style.css'},{name:'theme2',style:'style2.css'}];
    }
  },
};

const apolloServer = new ApolloServer({typeDefs, resolvers});

export default cors(async function handler(req, res) {
    if(req.method === 'OPTIONS') {
        res.end();
        return false;
    }
    await apolloServer.start();

    await apolloServer.createHandler({
        path: '/api/graphql',
    })(req, res);
});