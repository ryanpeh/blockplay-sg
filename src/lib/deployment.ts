/** Build-only switch: local development retains the optional backend features. */
export const IS_STATIC_SITE = import.meta.env.MODE === 'sites';
