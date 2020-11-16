/**
 * BIWS StickyParallax
 *
 * Copyright Patrick Bogdan. All rights reserved.
 * See LICENSE.txt for license details.
 */

; (function (biws) {
    biws.stickyParallax = ({
        containerSelector,
        maxOffset = 40,
        opacityOffset = 25,
        padding = 50,
    } = {}) => {

        const css = {
            container: 'sticky-parallax-container',
            lockup: 'sticky-parallax-lockup',
            block: 'sticky-parallax-block',
            active: 'sticky-block-active',
            next: 'sticky-block-next',
            willChange: 'sticky-block-will-change',
        },
            nextIndexes = {},
            activeIndexes = {};

        let validContainers = [],
            activeContainerIndexes = [],
            tick = false,
            windowHeight = window.innerHeight || document.documentElement.clientHeight;

        if (!containerSelector) {
            console.error('Sticky Parallax called with invalid arguments.');
            console.groupCollapsed('Errors')
            if (!containerSelector) {
                console.log('containerSelector not set')
            }
            console.groupEnd();
            return;
        }

        const containers = document.querySelectorAll(containerSelector);

        if (!containers.length) {
            console.error('No elements found for containerSelector', containerSelector);
            return;
        }

        const arrayRemoveItem = (array, item) => {
            while (array.includes(item)) {
                const index = array.indexOf(item);
                array.splice(index, 1);
            }
        },
            getElementHeight = (element) => {
                const computedStyle = getComputedStyle(element);

                let height = element.clientHeight;
                height -= parseFloat(computedStyle.paddingTop) + parseFloat(computedStyle.paddingBottom);
                return height;
            },
            isElement = (o) => {
                if (typeof HTMLElement === 'object'
                    ? o instanceof HTMLElement
                    : o && typeof o === 'object' && o !== null && o.nodeType === 1 && typeof o.nodeName === 'string') {
                    return true;
                }

                console.error('Element is not a valid HTML element', element);
                return false;
            },
            isInViewPort = (element) => {
                const rect = element.getBoundingClientRect();
                return rect.top < windowHeight && rect.bottom > 0;
            },
            isValidSelection = (element) => {
                const animationSpace = maxOffset * 2,
                    totalPadding = padding * 2;

                if (!getComputedStyle) {
                    console.log('getComputedStyle not supported by browser.');
                    return false;
                }

                if (!isElement(element)) {
                    console.error('Element not valid');
                    return false;
                }

                // children should not be > window height and allow space for animation and padding
                for (const child of element.children) {
                    if (getElementHeight(child) + animationSpace + totalPadding > windowHeight) {
                        console.log('child too high', child);
                        return false;
                    }
                }

                return true;
            },
            isContentWrapped = (element, className) => {
                const child = element.firstElementChild;
                if (!child) {
                    return false;
                }

                if (!isElement(child)) {
                    console.error('Child not an element.');
                    return false;
                }

                return child.classList.contains(className);
            },
            wrapContent = (element, className) => {
                if (isContentWrapped(element, className)) {
                    return;
                }
                const wrapper = document.createElement('div');
                wrapper.classList.add(className);
                wrapper.append(...element.children);
                element.append(wrapper);
            },
            unwrapContent = (element, className) => {
                if (!isElement(element)) {
                    console.error('Cannot unwrap content.');
                    return;
                }

                if (!isContentWrapped(element, className)) {
                    return;
                }

                const wrapper = element.firstElementChild;
                const children = wrapper.children;
                element.removeChild(wrapper);
                element.append(...children);
            },
            calculateOpacity = (offset) => {
                const abs = Math.abs(offset);
                if (abs > maxOffset) {
                    return 0;
                }

                const diff = abs - opacityOffset;
                if (diff <= 0) {
                    return 1;
                }

                const factor = maxOffset - opacityOffset;

                return 1 - (diff / factor)
            },
            calculateBlockSettings = (container, blocks) => {
                let active, next, offset, opacity;

                const rect = container.getBoundingClientRect();

                if (rect.top > 0) {
                    // container is below current viewport
                    active = -1;
                    offset = maxOffset;
                } else if (rect.bottom < 0) {
                    // container is above current viewport
                    active = blocks.length;
                    offset = -maxOffset;
                } else {
                    active = Math.ceil(Math.abs(rect.top) / windowHeight) - 1;
                    offset = ((rect.top % windowHeight) / windowHeight * 2 * maxOffset) + maxOffset;
                    opacity = calculateOpacity(offset);
                }
                if (active < 0) {
                    next = 0;
                } else if (active === 0) {
                    next = active + 1;
                } else if (active === blocks.length - 1) {
                    next = active - 1;
                } else if (active >= blocks.length) {
                    next = blocks.length - 1;
                } else {
                    next = offset > 0 ? active - 1 : active + 1;
                }
                return {
                    active: active,
                    next: next,
                    offset: offset,
                    opacity: opacity
                };
            },
            setBlockClass = (block, className, state = true) => {
                if (!block) {
                    return;
                }
                if (state) {
                    block.classList.add(className);
                } else {
                    block.classList.remove(className);
                }
            },
            setActiveBlock = (block, state = true) => {
                setBlockClass(block, css.active, state);
            },
            setNextBlock = (block, state = true) => {
                setBlockClass(block, css.next, state);
            },
            setWillChange = (block, state = true) => {
                setBlockClass(block, css.willChange, state);
            },
            setBlockStyle = ({ block, offset, opacity } = {}) => {
                if (!block) {
                    return;
                }
                // fixme handle prefix -webkit etc
                if (offset !== undefined) {
                    block.style.transform = `translateY(${offset}px)`;
                }
                if (opacity !== undefined) {
                    block.style.opacity = opacity;
                }
            },
            unsetBlockStyle = (block, transform = true, opacity = true) => {
                // fixme handle prefix -webkit etc
                if (transform) {
                    block.style.removeProperty('transform');
                }
                if (opacity) {
                    block.style.removeProperty('opacity');
                }
            },
            updateBlocks = (container, containerIndex) => {
                const blocks = getBlocks(container),
                    settings = calculateBlockSettings(container, blocks),
                    active = blocks[settings.active];

                if (!isInViewPort(container)) {
                    arrayRemoveItem(activeContainerIndexes, containerIndex);
                    for (const block of blocks) {
                        setBlockStyle({
                            block: block,
                            opacity: 1
                        });
                    }
                } else if (!activeContainerIndexes.includes(containerIndex)) {
                    activeContainerIndexes.push(containerIndex);
                    for (const block of blocks) {
                        setBlockStyle({
                            block: block,
                            opacity: 0
                        });
                    }
                }
                if (activeIndexes[containerIndex] !== settings.active) {
                    const prevIndex = activeIndexes[containerIndex],
                        prev = blocks[prevIndex];

                    setActiveBlock(prev, false);
                    setBlockStyle({
                        block: prev,
                        opacity: 0,
                    })
                    setActiveBlock(active);
                }
                if (nextIndexes[containerIndex] !== settings.next) {
                    const prevIndex = nextIndexes[containerIndex],
                        prev = blocks[prevIndex],
                        next = blocks[settings.next];

                    setNextBlock(prev, false);
                    setNextBlock(next);
                }
                if (activeIndexes[containerIndex] !== settings.active ||
                    nextIndexes[containerIndex] !== settings.next) {
                    const prevActive = blocks[activeIndexes[containerIndex]],
                        prevNext = blocks[nextIndexes[containerIndex]],
                        next = blocks[settings.next];
                    if (prevNext != active && prevNext != next) {
                        setWillChange(prevNext, false);
                    }
                    if (prevActive != active && prevActive != next) {
                        setWillChange(prevActive, false);
                    }
                    setWillChange(active);
                    setWillChange(next);
                }

                setBlockStyle({
                    block: active,
                    offset: settings.offset,
                    opacity: settings.opacity
                });

                activeIndexes[containerIndex] = settings.active;
                nextIndexes[containerIndex] = settings.next;
            },
            makeStickyParallax = (element) => {
                const childCount = element.children.length;
                if (!childCount) {
                    console.error('Element does hot have children for sticky parallax effect', element)
                    return;
                }

                element.classList.add(css.container);
                element.style.height = `${100 * (childCount + 1)}vh`;
                element.style.paddingTop = 0;
                element.style.paddingBottom = 0;
                element.style.marginTop = 0;
                element.style.marginBottom = 0;
                for (const child of element.children) {
                    child.classList.add(css.block);
                    setBlockStyle({
                        block: child,
                        offset: maxOffset
                    });
                    child.style.paddingTop = 0;
                    child.style.paddingBottom = 0;
                    child.style.marginTop = 0;
                    child.style.marginBottom = 0;
                }

                if (isContentWrapped(element, css.lockup)) {
                    return;
                }
                wrapContent(element, css.lockup);
            },
            unmakeStickyParallax = (element) => {
                element.classList.remove(css.container);
                element.style.removeProperty('height');

                if (isContentWrapped(element, css.lockup)) {
                    unwrapContent(element, css.lockup);
                }

                element.style.removeProperty('padding-top');
                element.style.removeProperty('padding-bottom');
                element.style.removeProperty('margin-top');
                element.style.removeProperty('margin-bottom');

                for (const child of element.children) {
                    child.classList.remove(css.block);
                    unsetBlockStyle(child);
                    child.style.removeProperty('padding-top');
                    child.style.removeProperty('padding-bottom');
                    child.style.removeProperty('margin-top');
                    child.style.removeProperty('margin-bottom');
                    setActiveBlock(child, false);
                    setNextBlock(child, false);
                    setWillChange(child, false);
                }
            },
            getBlocks = (container) => {
                return container.querySelectorAll(`.${css.lockup} .${css.block}`);
            },
            init = (containers) => {
                activeContainerIndexes = [];

                const validContainers = [];
                let index = 0;

                for (const container of containers) {
                    unmakeStickyParallax(container);
                    if (!isValidSelection(container)) {
                        continue;
                    }

                    makeStickyParallax(container);

                    validContainers.push(container);

                    updateBlocks(container, index++);
                }

                return validContainers;
            },
            handleScroll = (event) => {
                if (tick) {
                    return;
                }

                tick = true;
                window.requestAnimationFrame(() => {
                    let index = 0;
                    for (const container of validContainers) {
                        updateBlocks(container, index++);
                    }
                    tick = false;
                })
            },
            handleResize = (event) => {
                if (tick) {
                    return;
                }
                tick = true;
                windowHeight = window.innerHeight || document.documentElement.clientHeight;
                window.requestAnimationFrame(() => {
                    validContainers = init(containers);
                    tick = false;
                });
            };

        validContainers = init(containers);

        window.addEventListener('resize', handleResize);

        window.addEventListener('scroll', handleScroll);
    }
}(window.biws = window.biws || {}));