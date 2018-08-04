from app import apfell, db_objects
from app.database_models.model import Callback
from sanic.response import text
from anytree import Node, find_by_attr, RenderTree, DoubleStyle


# ------- ANALYTIC-BASED API FUNCTION -----------------
@apfell.route("/api/v1.0/analytics/callback_tree")
async def analytics_callback_tree_api(request):
    # look at the current callbacks and return their data in a more manageable tree format
    # http://anytree.readthedocs.io/en/latest/
    dbcallbacks = await db_objects.execute(Callback.select())
    callbacks = []
    for dbc in dbcallbacks:
        callbacks.append(dbc.to_json())
    # every callback with a pcallback of null should be at the root (remove them from list as we place them)
    tree = set()
    while len(callbacks) != 0:  # when we hit 0 we are done processing
        for c in callbacks:
            # this is the root of a 'tree'
            if c['pcallback'] == 'null':
                tree.add(Node(str(c['id']), display=str(c['user'] + "@" + c['host'] + "(" + str(c['pid']) + "): " + c['description'])))
                callbacks.remove(c)  # remove the one we just processed from our list
            else:
                for t in tree:
                    # for each tree in our list, see if we can find the parent
                    leaf = find_by_attr(t, str(c['pcallback']))
                    if leaf:
                        Node(str(c['id']), parent=leaf, display=str(c['user'] + "@" + c['host'] + "(" + str(c['pid']) + "): " + c['description']))
                        callbacks.remove(c)
                        break
    output = ""
    for t in tree:
        output += str(RenderTree(t, style=DoubleStyle).by_attr("display")) + "\n"
    return text(output)
