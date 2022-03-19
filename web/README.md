# Overview

This file (/web/README.en.md) contains information on front-end (under /web) development.
For information about the entire system, see /README.md.

# Internationalization

Messages for end users are displayed in other languages using i18next.
Use i18next's t function to output messages.

```typescript
t('translation key')
```

To embed a parameter in a message, it can be written as follows.

```typescript
t('translation key',{parameter:'value', ...})
```

Parameters are used in the translation dictionary as follows.

```JSON
    'translation key':'message {{parameter}}',
```

## Check for missing keys in translation dictionary


The default setting of the t function outputs the arguments as they are with fallback functionality without the need to prepare a translation dictionary.
Since it does not generate errors or warnings, you may not be aware that a translation dictionary is missing.
Please follow the steps below to check for missing items.

```shell
yarn i18next-extract
```

t('...') in the source code. from the source code and writes it to locales/extract_en.json.
It then compares it with the key list in locales/en/translation.json to show what is missing.

```When there are no omissions
missing translation keys : []
```

```When there are omissions
missing translation keys : [ '画像を埋め込み' ]
```
