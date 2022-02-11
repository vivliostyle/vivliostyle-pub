import { getDirective, MapperKind, mapSchema } from "@graphql-tools/utils";
import { AuthenticationError } from "apollo-server-micro";
import { defaultFieldResolver, GraphQLSchema } from "graphql";

export type queryContext = {
    roles?: string[];
    token?: string;
  };

/**
 * 認証認可
 */
export function executeAuth(fieldConfig: any, authDirective: any) {
    const {resolve = defaultFieldResolver} = fieldConfig;
    // 項目の処理を上書きする
    fieldConfig.resolve = async function (...args: any[]) {
      const requiredRole = authDirective.requires;
      // console.log(requiredRole);
      if (!requiredRole) {
        // 必須Roleが指定されていなければデフォルトの処理を行なう
        return resolve.apply(this, args);
      }
  
      const context = args[2];
      // console.log('context',context);
      if (!context || !context.roles || !context.roles.includes(requiredRole)) {
        throw new AuthenticationError('not authorized');
      }
  
      return resolve.apply(this, args);
    };
    return fieldConfig;
  }
  
  /**
   * @authを処理できるスキーマに書き換える
   * @param schema
   * @returns
   */
  export function authDirectiveTransformer(schema: GraphQLSchema) {
    const directiveName = 'auth';
    const typeDirectiveArgumentMaps: Record<string, any> = {};
  
    return mapSchema(schema, {
      // 型単位での認可が出来るようにするため
      // スキーマの型定義に付与されている@authディレクティブを記録しておく
      [MapperKind.TYPE]: (typeName) => {
        // console.log('typeName\n',typeName);
        const authDirective = getDirective(schema, typeName, directiveName)?.[0];
        if (authDirective) {
          typeDirectiveArgumentMaps[typeName.toString()] = authDirective;
        }
        return typeName;
      },
      // スキーマのプロパティを処理する
      [MapperKind.OBJECT_FIELD]: (fieldConfig, _fieldName, typeName) => {
        // console.log('fieldConfig\n',fieldConfig,_fieldName,typeName);
        const authDirective =
          getDirective(schema, fieldConfig, directiveName)?.[0] ?? // 項目毎の@authディレクティブを取得する
          typeDirectiveArgumentMaps[typeName]; // 項目に指定されていなければ型の@authディレクティブも探す
        if (authDirective) {
          // @authが指定されている
          return executeAuth(fieldConfig, authDirective);
        }
        return fieldConfig;
      },
    });
  }
  