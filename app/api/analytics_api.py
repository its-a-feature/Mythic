from app import apfell, db_objects
from app.database_models.model import Callback, Payload
from sanic.response import text
from anytree import Node, find_by_attr, RenderTree, DoubleStyle
from sanic_jwt.decorators import protected, inject_user


# ------- ANALYTIC-BASED API FUNCTION -----------------
@apfell.route(apfell.config['API_BASE'] + "/analytics/callback_tree", methods=['GET', 'POST'])
@inject_user()
@protected()
async def analytics_callback_tree_api(request, user):
    # look at the current callbacks and return their data in a more manageable tree format
    # http://anytree.readthedocs.io/en/latest/
    dbcallbacks = await db_objects.execute(Callback.select())
    callbacks = []
    # Default values here
    display_config = {}
    display_config['inactive'] = False  # by default, include only active callbacks
    display_config['strikethrough'] = False
    # The POST version of this API function will provide modifiers for what specific information to provide in the callback tree, but the main logic remains the same
    if request.method == 'POST':
        data = request.json
        if 'inactive' in data:
            display_config['inactive'] = data['inactive']
        if 'strikethrough' in data:
            display_config['strikethrough'] = data['strikethrough']
    
    for dbc in dbcallbacks:
        if display_config['inactive']:  # include everything
            callbacks.append(dbc.to_json())
        elif dbc.active:
            callbacks.append(dbc.to_json())
    # every callback with a pcallback of null should be at the root (remove them from list as we place them)
    tree = []
    while len(callbacks) != 0:  # when we hit 0 we are done processing
        for c in callbacks:
            # this is the root of a 'tree'
            if c['pcallback'] == 'null':
                display = await analytics_callback_tree_api_function(c, display_config)
                tree.append(Node(str(c['id']), display=display))
                callbacks.remove(c)  # remove the one we just processed from our list
            else:
                for t in tree:
                    # for each tree in our list, see if we can find the parent
                    leaf = find_by_attr(t, str(c['pcallback']))
                    if leaf:
                        display = await analytics_callback_tree_api_function(c, display_config)
                        Node(str(c['id']), parent=leaf, display=display)
                        callbacks.remove(c)
                        break
    output = ""
    for t in tree:
        output += str(RenderTree(t, style=DoubleStyle).by_attr("display")) + "\n"
    return text(output)


async def analytics_callback_tree_api_function(callback, config):
    # this takes in a configuration dictionary and returns a specific pretty-printed
    #  string for use in the analytics_callback_tree_api function
    # the callback parameter is a dictionary
    display = ""
    display += callback['user'] + "@" + callback['host'] + "(" + str(callback['pid']) + "): " + callback['description']
    if config['strikethrough'] and not callback['active']:
        display = "<del>" + display + "</del>"

    return display


async def analytics_payload_tree_api_function(payload, config):
    display = ""
    display += payload.operator.username + "'s " + payload.payload_type + " payload with " + payload.c2_profile.name + " c2 profile with tag: "
    display += payload.tag
    return display


@apfell.route(apfell.config['API_BASE'] + "/analytics/payload_tree", methods=['GET', 'POST'])
@inject_user()
@protected()
async def analytics_payload_tree_api(request, user):
    # each payload is the root of a tree, all of the corresponding callbacks that use it are under that tree
    dbpayloads = await db_objects.execute(Payload.select())
    display_config = {}
    display_config['inactive'] = False  # by default, include only active callbacks
    display_config['strikethrough'] = False
    if request.method == 'POST':
        data = request.json
        if 'inactive' in data:
            display_config['inactive'] = data['inactive']
        if 'strikethrough' in data:
            display_config['strikethrough'] = data['strikethrough']
    tree = []
    for p in dbpayloads:
        display = await analytics_payload_tree_api_function(p, display_config)
        ptree = Node(str(p.id), display=display)
        # now get all callbacks that have this payload tied to it
        if display_config['inactive']:
            # we want to display the inactive ones as well
            using_callbacks = await db_objects.execute(Callback.select().where(Callback.registered_payload==p))
        else:
            using_callbacks = await db_objects.execute(Callback.select().where( (Callback.registered_payload==p) &
                                                                                (Callback.active == True)))
        tree.append(ptree)
        for c in using_callbacks:
            # each of these callbacks has ptree as an associated payload
            callback_display = await analytics_callback_tree_api_function(c.to_json(), display_config)
            Node(str(c.id), parent=ptree, display=callback_display)
    output = ""
    for t in tree:
        # this is iterating over each payload-based tree
        output += str(RenderTree(t, style=DoubleStyle).by_attr("display")) + "\n"
    return text(output)
