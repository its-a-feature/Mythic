import re


async def breakout_quoted_params(input):
    # return an array of the broken out params as if they were on the command line
    # or return an error
    regex = re.compile(r'((?<![\\])[\'"])((?:.(?!(?<![\\])\1))*.?)\1')
    potential_groups = regex.findall(input)
    return [x[1] for x in potential_groups]
