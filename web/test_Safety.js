var _ = require('underscore');
var url = require('url');
var Safety = require('./Safety');

describe('Safety.isValidEmail', function() {
  function cgood(email) {
    if (!Safety.isValidEmail(email)) throw new Error('should be valid, but isValidEmail=false: ' + email);
  }
  function cbad(email) {
    if (Safety.isValidEmail(email)) throw new Error('should be invalid, but isValidEmail=true: ' + email);
  }
  it('should work', function() {
    
    cgood('tlb@tlb.org');
    cgood('t@semi-anonymous.com');
    cgood('foo@bar.com');
    cbad('foo@bar');
    cgood('cloud-test+special_characters@foo.com');
  });
});


describe('Safety.isValidPassword', function() {
  function cgood(password) {
    if (!Safety.isValidPassword(password)) throw new Error('should be valid, but isValidPassword=false: ' + password);
  }
  function cbad(password) {
    if (Safety.isValidPassword(password)) throw new Error('should be invalid, but isValidPassword=true: ' + password);
  }
  it('should work', function() {
    
    cgood('foobar');
    cgood('h^77j@429');
    cgood('ugly123');
    cbad('ho');
    cbad('hobart\u1234;');
  });  
});

