/* ms-word-transform-utils.js is part of Aloha Editor project http://aloha-editor.org
 *
 * Aloha Editor is a WYSIWYG HTML5 inline editing library and editor.
 * Copyright (c) 2010-2013 Gentics Software GmbH, Vienna, Austria.
 * Contributors http://aloha-editor.org/contribution.php
 */
define([
	'dom',
	'predicates'
], function(
	Dom,
	Predicates
) {
	'use strict';

	/**
	 * Check if the textContent of the 'element' is empty
	 *
	 *
	 * @param {Element} element
	 * @return {boolean}
	 */
	function hasText(element) {
		return Dom.getTextContent(element).trim().length;
	}

	/**
	 * Get next sibling ignoring empty Text Nodes
	 *
	 * @param {Element} node
	 * @return {Element} Next sibling
	 */
	function nextNotEmptyElementSibling(node) {
		node = node.nextElementSibling;
		while (node && !hasText(node)) {
			node = node.nextElementSibling;
		}
		return node;
	}

	/**
	 * Create a header HTML destination with the children of 'node'
	 *
	 * @param {Element} source
	 * @param {Element} destination
	 */
	function copyChildNodes(source, destination) {
		if (source.nodeType === Dom.Nodes.TEXT) {
			destination.appendChild(source.cloneNode(true));
			return;
		}

		while (source.firstChild) {
			destination.appendChild(source.firstChild);
		}
	}

	/**
	 * Replaces the node by other.
	 *
	 * @param {Element} nodeSrc
	 * @param {Element} nodeDst
	 */
	function replaceNode(nodeSrc, nodeDst) {
		copyChildNodes(nodeSrc, nodeDst);
		if (nodeSrc.parentNode) {
			nodeSrc.parentNode.replaceChild(nodeDst, nodeSrc);
		}
	}

	/**
	 * Get the next sibling and removes the actual element
	 *
	 * @param {Element} element
	 * @param {Element} parentNode
	 * @return {Element}
	 */
	function nextNotEmptyElementSiblingAndRemoves(element, parentNode) {
		var nextSibling = nextNotEmptyElementSibling(element);
		parentNode.removeChild(element);
		return nextSibling;
	}

	/**
	 * Removes empty child elements and returns those who are not
	 *
	 * @param node
	 * @return {NodeList}
	 */
	function removeEmptyChildren(node) {
		var childNodes = node.childNodes;

		for (var i = 0, len = childNodes.length; i < len; i++) {
			if (childNodes[i] && !hasText(childNodes[i])) {
				node.removeChild(childNodes[i]);
			}
		}
	}

	/**
	 * Removes recursively any child when 'conditionFn' returns true.
	 *
	 * @param {Element} node
	 * @param {function} conditionFn Function which returns true or false to decide if
	 *                   the child should be removed
	 */
	function removeDescendants(node, conditionFn) {
		walkDescendants(node, conditionFn, function(child) {
			child.parentNode.removeChild(child);
		});
	}

	/**
	 * Executes function 'callBackFn' when the function condition 'conditionFn' is true.
	 *
	 * @param {Element} element
	 * @param {function(Element):boolean} conditionFn
	 * @param {function(Element)} callBackFn
	 */
	function walkDescendants(element, conditionFn, callBackFn) {
		var childNodes = element.childNodes,
		    child;

		for (var i = childNodes.length - 1; i >= 0; i--) {
			child = childNodes[i];
			if (child) {
				if (conditionFn(child)){
					callBackFn(child);
					// check if the child has changed
					if (child !== childNodes[i]) {
						i++;
					}
				}
				if (Dom.isElementNode(child)) {
					walkDescendants(child, conditionFn,  callBackFn);
				}
			}
		}
	}

	/**
	 * Unwraps any child of 'node' when the function 'conditionFn' is true.
	 *
	 * @param {Element} node
	 * @param {function(Element):boolean} conditionFn
	 */
	function unwrapDescendants(node, conditionFn) {
		walkDescendants(node, conditionFn, function(child) {
			Dom.removeShallow(child);
		});
	}

	/**
	 * Wrap several childNodes in a new 'nodeName' HTML element.
	 * childNodes belongs to the same parent.
	 *
	 * @param {Array.<Element>} childNodes
	 * @param {string} nodeName
	 */
	function wrapChildNodes(childNodes, nodeName) {
		if (childNodes.length === 0) {
			return;
		}

		var parentNode = childNodes[0].parentNode,
		    tag = parentNode.ownerDocument.createElement(nodeName);

		parentNode.insertBefore(tag, childNodes[0]);

		for (var i = 0, len = childNodes.length; i < len; i++) {
			tag.appendChild(childNodes[i]);
		}
	}

	/**
	 * Removes all attributes from an element.
	 *
	 * @param {!Element} element
	 */
	function removeAllAttributes(element) {
		var attributes = element.attributes;
		if (!attributes) {
			return;
		}
		for (var i = attributes.length - 1; i >= 0 ; i--) {
			if (attributes[i] !== undefined && element.hasAttribute(attributes[i].name)) {
				Dom.removeAttr(element, attributes[i].name);
			}
		}
	}

	/**
	 * Cleans the given element.
	 *
	 * @param {Element} element
	 */
	function cleanElement(element) {
		var child,
		    prev,
			textLevelElement;

		removeAllAttributes(element);

		unwrapDescendants(element, function(node) {
			return node.nodeName === 'SPAN' || node.nodeName === 'FONT';
		});

		walkDescendants(element, function(node) {
			return node.nodeName !== 'IMG' && node.nodeName !== 'A';
		}, removeAllAttributes);

		child = element.firstChild;

		while (child) {
			textLevelElement = Predicates.isTextLevelSemanticNode(child)
			                   && !Predicates.isVoidNode(child);

			if (child.nodeName === 'SPAN' || child.nodeName === 'FONT'
			    || (!hasText(child) && textLevelElement)) {
				Dom.removeShallow(child);
				child = prev || element.firstChild;
			} else {
				prev = child;
				child = child.nextSibling;
			}
		}
	}

	function createNestedList(actualLevel, lastLevel, listHTML, createListFn) {
		var doc = listHTML.ownerDocument,
			newList;

		while (actualLevel > lastLevel) {
			newList = createListFn();
			listHTML.appendChild(newList);
			listHTML = newList;
			lastLevel++;
		}

		while (actualLevel < lastLevel) {
			if (listHTML.parentNode === null) {
				newList = createListFn();
				newList.appendChild(listHTML);
			}
			listHTML = listHTML.parentNode;
			lastLevel--;
		}
		return listHTML;
	}

	return {
		wrapChildNodes: wrapChildNodes,
		copyChildNodes: copyChildNodes,
		hasText: hasText,
		removeEmptyChildren: removeEmptyChildren,
		removeDescendants: removeDescendants,
		unwrapDescendants: unwrapDescendants,
		nextNotEmptyElementSibling: nextNotEmptyElementSibling,
		nextSiblingAndRemoves: nextNotEmptyElementSiblingAndRemoves,
		replaceNode: replaceNode,
		removeAllAttributes: removeAllAttributes,
		cleanElement: cleanElement,
		createNestedList: createNestedList
	};
});