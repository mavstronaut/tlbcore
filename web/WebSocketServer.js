/*
  
  Info:
    https://developer.mozilla.org/en-US/docs/WebSockets/Writing_WebSocket_client_applications
    https://developer.mozilla.org/en-US/docs/Web/API/WebSocket
    http://www.w3.org/TR/websockets/
    https://tools.ietf.org/html/rfc6455
    https://github.com/Worlize/WebSocket-Node/wiki/Documentation
*/
var _                   = require('underscore');
var util                = require('util');
var logio               = require('./logio');
var WebSocketHelper     = require('./WebSocketHelper');

var verbose = 1;

exports.mkWebSocketRpc = mkWebSocketRpc;


function mkWebSocketRpc(wsr, wsc, handlers) {
  var pending = new WebSocketHelper.RpcPendingQueue();
  var rxBinaries = [];

  setupWsc();
  setupHandlers();
  return handlers;

  function setupWsc() {
    wsc.on('message', function(event) {
      if (event.type === 'utf8') {
        if (verbose >= 2) logio.I(handlers.label, event.utf8Data);
        var msg = WebSocketHelper.parse(event.utf8Data, rxBinaries);
        rxBinaries = [];
        handleMsg(msg);
      }
      else if (event.type === 'binary') {
        if (verbose >= 3) logio.I(handlers.label, 'Binary len=' + event.binaryData.byteLength);
        rxBinaries.push(event.binaryData);
      }
      else {
        if (verbose >= 1) logio.E(handlers.label, 'Unknown type ' + m.type);
      }
    });
    wsc.on('close', function(code, desc) {
      if (verbose >= 1) logio.I(handlers.label, 'close', code, desc);
      if (handlers.close) handlers.close();
    });
  }

  function handleMsg(msg) {
    if (msg.cmd) {
      var cmdFunc = handlers['cmd_' + msg.cmd];
      if (!cmdFunc) {
        if (verbose >= 1) logio.E(handlers.label, 'Unknown cmd', msg.cmd);
        return;
      }
      cmdFunc.call(handlers, msg);
    }
    else if (msg.rpcReq) {
      var reqFunc = handlers['req_' + msg.rpcReq];
      if (!reqFunc) {
        if (verbose >= 1) logio.E(handlers.label, 'Unknown rpcReq', msg.rpcReq);
        return;
      }
      var done = false;
      try {
        reqFunc.call(handlers, msg, function(rsp) {
          done = true;
          rsp.rspId = msg.reqId;
          handlers.tx(rsp);
        });
      } catch(ex) {
        if (!done) {
          done = true;
          handlers.tx({rspId: msg.reqId, err: ex.toString()});
        }
      }
    }
    else if (msg.rspId) {
      var rspFunc = pending.get(msg.rspId);
      if (!rspFunc) {
        if (verbose >= 1) logio.E(handlers.label, 'Unknown response', msg.rspId);
        return;
      }
      rspFunc.call(handlers, msg);
    }
    else if (msg.hello) {
      handlers.hello = msg.hello;
      if (handlers.onHello) handlers.onHello();
    }
    else {
      if (verbose >= 1) logio.E(handlers.label, 'Unknown message', msg);
    }
  }

  function setupHandlers() {
    handlers.label = wsc.remoteAddress + '!ws' + wsr.resource;
    handlers.rpc = function(req, rspFunc) {
      var reqId = pending.getnewId();
      req.reqId = reqId;
      pending.add(reqId, rspFunc);
      handlers.tx(req);
    };
    handlers.tx = function(msg) {
      emitMsg(msg);
    };
    if (handlers.start) handlers.start();
  }

  function emitMsg(msg) {
    var msgParts = WebSocketHelper.stringify(msg);
    _.each(msgParts.binaries, function(data) {
      // See http://stackoverflow.com/questions/8609289/convert-a-binary-nodejs-buffer-to-javascript-arraybuffer
      // and http://nodejs.org/api/buffer.html
      var buf = new Buffer(new Uint8Array(data));
      if (verbose >= 3) logio.O(handlers.label, 'buffer length ' + buf.length);
      wsc.sendBytes(buf);
    });
    wsc.sendUTF(msgParts.json);
    if (verbose >= 2) logio.O(handlers.label, msgParts.json);
  };
};