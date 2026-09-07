import {getAllTaskResponsesQuery, prepareTaskOutputDownload} from './TaskOutputDownload';

const prepare = (client, taskID) => prepareTaskOutputDownload({
    client,
    taskID,
    decodeResponse: value => value
});
const response = (taskID, text, id = 1) => ({id, task_id: taskID, response: text});
const deferred = () => {
    let resolve;
    const promise = new Promise(resolvePromise => { resolve = resolvePromise; });
    return {promise, resolve};
};

describe('prepareTaskOutputDownload', () => {
    test('queries and names output with the requested task ID', async () => {
        const client = {query: jest.fn().mockResolvedValue({
            data: {response: [response(33, 'first'), response(33, ' second', 2)]}
        })};

        await expect(prepare(client, 33)).resolves.toEqual({
            filename: 'task_33.txt',
            output: 'first second'
        });
        expect(client.query).toHaveBeenCalledWith({
            query: getAllTaskResponsesQuery,
            variables: {task_id: 33},
            fetchPolicy: 'network-only'
        });
    });

    test('keeps overlapping exports associated with their initiating tasks', async () => {
        const requests = {33: deferred(), 35: deferred()};
        const client = {query: jest.fn(({variables}) => requests[variables.task_id].promise)};
        const exports = {33: prepare(client, 33), 35: prepare(client, 35)};

        requests[35].resolve({data: {response: [response(35, 'task 35')]}});
        await expect(exports[35]).resolves.toEqual({filename: 'task_35.txt', output: 'task 35'});

        requests[33].resolve({data: {response: [response(33, 'task 33')]}});
        await expect(exports[33]).resolves.toEqual({filename: 'task_33.txt', output: 'task 33'});
    });

    test.each([
        ['another task', {data: {response: [response(35, 'wrong task')]}}, 'task 35 instead of task 33'],
        ['a malformed result', {data: undefined}, 'invalid response']
    ])('rejects output from %s', async (_case, result, expectedError) => {
        const client = {query: jest.fn().mockResolvedValue(result)};
        await expect(prepare(client, 33)).rejects.toThrow(expectedError);
    });
});
