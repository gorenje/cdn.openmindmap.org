(function() {

    function constructMermaid(nodes, direction="TB", redRef=undefined) {
        var msg = {
            payload: nodes
        }

        var nodes = msg.payload.filter((n) => {
            return n.type != "tab" && n.type != "group"
        })

        var id2node = {};
        for (var idx = 0; idx < nodes.length; idx++) {
            var nd = nodes[idx];
            id2node[nd.id] = nd;
        }

        /* redRef is a reference to RED object, if this is available, it's set, if not we 
            have to improvis. */
        var RED = redRef;
        if (!redRef) {
            RED = {
                nodes: {
                    node: (nId) => { return id2node[nId] },
                    subflow: (nId) => { return id2node[nId] }
                },
            }
        }

        var escapeForMermaid = (str) => {
            return str.replaceAll(
                "&", "&amp;"
            ).replaceAll(
                "#", "#35;"
            ).replaceAll(
                "[", "#91;"
            ).replaceAll(
                "]", "#93;"
            ).replaceAll(
                "(", "#40;"
            ).replaceAll(
                ")", "#41;"
            ).replaceAll(
                "|", "#124;"
            ).replaceAll(
                ">", "&gt;"
            ).replaceAll(
                "<", "&lt;"
            ).replaceAll(
                "{", "#123;"
            ).replaceAll(
                "}", "#125;"
            ).replaceAll(
                "/", "#47;"
            )
        };

        var node2label = (nd, nme = undefined) => {
            var labl = nd.name || nd.type;

            if (nme) {
                nme = "|" + escapeForMermaid(nme) + "| "
            } else { nme = "" }

            labl = escapeForMermaid(labl);

            switch (nd.type) {
                case "switch":
                case "join":
                case "split":
                    return nme + nd.id + "{\"" + labl + "\"}"

                case "link call":
                case "link out":
                    if (nd.mode && nd.mode == "return") {
                        return nme + nd.id + "[\\Link Return/]"
                    }

                    if (nd.name && !nd.name.match(/^link out/)) {
                        return nme + nd.id + "\{\{\"" + labl + "\"\}\}"
                    }

                    if (nd.linkType == "dynamic") {
                        labl = "\\Dynamic Target/"
                        return nme + nd.id + "\{\{\"" + labl + "\"\}\}"
                    }

                    var targetNode = (nd.links && nd.links.length > 0 && (id2node[nd.links[0]] || RED.nodes.node(nd.links[0])));
                    labl = escapeForMermaid((targetNode && targetNode.name) || nd.type)
                    return nme + nd.id + "\{\{\"" + labl + "\"\}\}"

                case "link in":
                    labl = escapeForMermaid(nd.name || (nd.links && nd.links.length > 0 && id2node[nd.links[0]] && id2node[nd.links[0]].name) || nd.type)
                    return nme + nd.id + "\{\{\"" + labl + "\"\}\}"

                case "junction":
                    return nme + nd.id + "((\"" + labl + "\"))"

                case "debug":
                    return nme + nd.id + "(\"" + labl + "\")"

                default:
                    if (nd.type.startsWith("subflow:")) {
                        var targetNode = RED.nodes.subflow(nd.type.replace(/subflow:/, ''))
                        labl = escapeForMermaid((targetNode && targetNode.name) || nd.type)
                    }

                    return nme + nd.id + "[\"" + labl + "\"]"
            }
        }

        /* 
          we attach the mermaid array on the msg object because if an exception
          happens, we can check how far this code got. That is by comparing the
          contents of this array with the payload, we know which node caused
          the exception.
        */
        msg.mermaid = [
            "%% change this to LR Node-RED like UML",
            "graph " + direction
        ];

        for (var idx = 0; idx < nodes.length; idx++) {
            var nde = nodes[idx];

            if (nde.links && nde.links.length > 0 && nde.type == "link out") {
                for (var ldx = 0; ldx < nde.links.length; ldx++) {
                    /* link-out wire: only add a dashed link wire iff the node is included in this graph */
                    if (id2node[nde.links[ldx]]) {
                        msg.mermaid.push(
                            node2label(nde) + " -.-> " + nde.links[ldx]
                        )
                    }
                }
            }

            if (nde.wires && nde.wires.length > 0) {
                if (nde.type == "switch") {
                    for (var odx = 0; odx < nde.wires.length; odx++) {
                        for (var wdx = 0; wdx < nde.wires[odx].length; wdx++) {
                            msg.mermaid.push(
                                node2label(nde) + " --> " + node2label(id2node[nde.wires[odx][wdx]], nde.rules[odx] && (nde.rules[odx].v || nde.rules[odx].t))
                            )
                        }
                    }
                } else {
                    var outputLabels = nde.outputLabels;
                    if (nde.type.startsWith("subflow:")) {
                        var targetNode = RED.nodes.subflow(nde.type.replace(/subflow:/, ''))
                        outputLabels = (targetNode && targetNode.outputLabels) || outputLabels
                    }

                    for (var odx = 0; odx < nde.wires.length; odx++) {
                        for (var wdx = 0; wdx < nde.wires[odx].length; wdx++) {
                            msg.mermaid.push(
                                node2label(nde) + " --> " + node2label(id2node[nde.wires[odx][wdx]], (outputLabels && outputLabels[odx]) || undefined)
                            )
                        }
                    }
                }
            }
        }

        return msg.mermaid.join("\n");
    }

    window.FlowToMermaid = {
        constructMermaid: constructMermaid
    }
})();