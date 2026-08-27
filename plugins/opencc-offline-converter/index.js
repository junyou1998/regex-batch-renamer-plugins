export default {
  async healthCheck(context) {
    return {
      ok: true,
      message: 'OpenCC 本地離線轉換引擎就緒'
    };
  },

  async transform(input, params, context) {
    if (!input || input.trim() === '') return input;

    let textToConvert = input;
    let ext = '';
    if (params.ignoreExtension !== false) {
      const lastDot = input.lastIndexOf('.');
      if (lastDot > 0) {
        textToConvert = input.substring(0, lastDot);
        ext = input.substring(lastDot);
      }
    }

    const mode = params.converter || 's2twp';
    const configMap = {
      's2twp': { from: 'cn', to: 'twp' },
      's2tw': { from: 'cn', to: 'tw' },
      's2hk': { from: 'cn', to: 'hk' },
      's2t': { from: 'cn', to: 't' },
      'tw2sp': { from: 'twp', to: 'cn' },
      'tw2s': { from: 'tw', to: 'cn' },
      'hk2s': { from: 'hk', to: 'cn' },
      't2s': { from: 't', to: 'cn' },
      't2jp': { from: 't', to: 'jp' },
      'jp2t': { from: 'jp', to: 't' }
    };
    const config = configMap[mode] || { from: 'cn', to: 'twp' };

    const convKey = 'conv_' + config.from + '_' + config.to;
    let converter = context.cache?.get(convKey);
    if (!converter && context.opencc) {
      converter = context.opencc.Converter(config);
      context.cache?.set(convKey, converter, 3600000);
    }

    if (converter) {
      return converter(textToConvert) + ext;
    }
    return input;
  },

  async transformBatch(inputs, params, context) {
    if (!inputs || inputs.length === 0) return inputs;
    
    const mode = params.converter || 's2twp';
    const configMap = {
      's2twp': { from: 'cn', to: 'twp' },
      's2tw': { from: 'cn', to: 'tw' },
      's2hk': { from: 'cn', to: 'hk' },
      's2t': { from: 'cn', to: 't' },
      'tw2sp': { from: 'twp', to: 'cn' },
      'tw2s': { from: 'tw', to: 'cn' },
      'hk2s': { from: 'hk', to: 'cn' },
      't2s': { from: 't', to: 'cn' },
      't2jp': { from: 't', to: 'jp' },
      'jp2t': { from: 'jp', to: 't' }
    };
    const config = configMap[mode] || { from: 'cn', to: 'twp' };

    const convKey = 'conv_' + config.from + '_' + config.to;
    let converter = context.cache?.get(convKey);
    if (!converter && context.opencc) {
      converter = context.opencc.Converter(config);
      context.cache?.set(convKey, converter, 3600000);
    }

    if (!converter) return inputs;

    return inputs.map(input => {
      if (!input || input.trim() === '') return input;
      let textToConvert = input;
      let ext = '';
      if (params.ignoreExtension !== false) {
        const lastDot = input.lastIndexOf('.');
        if (lastDot > 0) {
          textToConvert = input.substring(0, lastDot);
          ext = input.substring(lastDot);
        }
      }
      return converter(textToConvert) + ext;
    });
  }
};
