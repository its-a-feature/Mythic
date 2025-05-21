import { useApolloClient } from '@apollo/client';
import React from 'react';

export function useMythicLazyQuery(query, options) {
    const client = useApolloClient();

    return React.useCallback((partialOptions) => {
        return client.query({ ...options, ...partialOptions, query })
    }, [query, options, client])
}