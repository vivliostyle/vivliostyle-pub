import {useEffect, useState} from 'react';

import type {VivliostyleConfigSchema} from './vivliostyle.config'
import { User } from 'firebase/auth';
import { WebApiFs } from './fs/WebApiFS';

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

  console.log('config',configString);
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
  branch,
}: {
  owner: string;
  repo: string;
  branch: string | undefined;
  user: User | null;
}) {
  const [config, setConfig] = useState<VivliostyleConfigSchema>()
  useEffect(() => {
    if (!user || !branch) return
    (async () => {
      const props = {
        user,
        owner,
        repo,
        branch
      };
      console.log('config props',props);
      const fs = await WebApiFs.open(props);
      const content = await fs.readFile('vivliostyle.config.js');
      if( Array.isArray(content) ) {
        // https://docs.github.com/en/rest/reference/repos#get-repository-content--code-samples
        throw new Error(`Content type is not file`);
      }
      console.log('config',content);
      const parsedContent = parseConfig(content.toString()); //Buffer.from(content.content, 'base64').toString('utf8'))
      setConfig(parsedContent);
    })();
  }, [owner, repo, user, branch]);
  return config
}
