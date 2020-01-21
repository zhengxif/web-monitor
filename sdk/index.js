import perf from './perf'
import resource from './resource'
import xhrHook from './xhrHook'
import errorCatch from './errorCatch'



perf.init((perfData) => {
    console.log(perfData)
});

resource.init((entriesData) => {
    console.log(entriesData)
})

xhrHook.init((xhrInfo) => {
    console.log(xhrInfo)
})

errorCatch.init((err) => {
    console.log('errorCatch', err);
});