import {useEffect, useState} from 'react';
import fetch from 'isomorphic-unfetch';

import firebase from '@services/firebase';
import {ContentOfRepositoryApiResponse} from '../pages/api/github/contentOfRepository'
import type {VivliostyleConfigSchema} from './vivliostyle.config'

const parseConfig = (configString: string) => {
  // 
  // 本当はサーバーサイドで以下のようにしたいのですが
  // 現状サーバーサイドで requireFromString を行うと任意コード実行できてしまうため妥協しています
  // 
  // const config = requireFromString(configString) as VivliostyleConfigSchema;
  // const ajv = new Ajv({ strict: false });
  // const validate = ajv.getSchema<VivliostyleConfigSchema>('https://raw.githubusercontent.com/vivliostyle/vivliostyle-cli/37e588154c7647792c1c05f8144400719872f069/src/schema/vivliostyle.config.schema.json')
  // if(!validate) {
  //   throw new Error(
  //     `Validation of vivliostyle.config failed. Please check the schema`,
  //   );
  // }
  // const valid = validate(config);
  // if (!valid) {
  //   throw new Error(
  //     `Validation of vivliostyle.config failed. Please check the schema`,
  //   );
  // }
  // return config;
  // 

  const configJsonString = configString
    .replace('module.exports = ', '')
    .replaceAll(/^\s*(.+):/gm, '"$1":')
    .replaceAll(`'`, '"')
    .replaceAll(/,[\s\n]*([\]}])/g, "$1")
    .replaceAll(/};/g, "}")
    
  return JSON.parse(configJsonString) as VivliostyleConfigSchema;
};

export function useVivlioStyleConfig({
  owner,
  repo,
  user,
}: {
  owner: string;
  repo: string;
  user: firebase.User | null;
}) {
  const [config, setConfig] = useState<VivliostyleConfigSchema>()
  useEffect(() => {
    if (!user) return
    (async () => {
      const idToken = await user.getIdToken();
      const params = {owner, repo, path: 'vivliostyle.config.js'}
      const query_params = new URLSearchParams(params); 
      const content : ContentOfRepositoryApiResponse = await fetch(
        `/api/github/contentOfRepository?${query_params}`,
        {
          headers: {
            'content-type': 'application/json',
            'x-id-token': idToken,
          },
        },
      ).then((r) => r.json());
      if( Array.isArray(content) || !("content" in content) ) {
        // https://docs.github.com/en/rest/reference/repos#get-repository-content--code-samples
        throw new Error(`Content type is not file`);
      }
      const parsedContent = parseConfig(Buffer.from(content.content, 'base64').toString('utf8'))
      setConfig(parsedContent);
    })();
  }, [owner, repo, user]);
  return config
}
