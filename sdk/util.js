export default {
    onload(cb) {
        if (document.readyState === 'complete') {
            cb();
        }
        window.addEventListener('load', cb);
    }
}