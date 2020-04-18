import React from 'react';
import 'bootstrap/dist/css/bootstrap.min.css';
import './App.css';
import { Form, Button, Row, Col, Spinner } from 'react-bootstrap';

interface State {
  creating: boolean;
  url: string;
}

class App extends React.Component {
  state: State = {
    creating: false,
    url: ''
  }

  handleSubmit (event : React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    this.setState({creating: true})
    fetch(`https://neko-zt3rq2mmqq-an.a.run.app/pdf/${form.owner.value}/${form.repo.value}`)
      .then(res => res.text())
      .then(url => this.setState({url}))
  }

  render () {
    return (
      <div className="App">
        <header className="App-header">
          <img src="logo.png" />
          { this.state.url ?
            <div>
              <p>印刷用のPDFファイルの作成が完了しました。</p>
              <Button variant="primary" size="lg" onClick={() => window.open(this.state.url)}>PDFを開く</Button>
            </div> : 
            this.state.creating ?
              <div>
                <p>印刷用のPDFを作成しています…</p>
                <Spinner animation="border" variant="primary" />
              </div> :
              <Form onSubmit={(event : React.FormEvent<HTMLFormElement>) => this.handleSubmit(event)}>
                <Form.Group as={Row} controlId="owner">
                  <Form.Label column sm="2">Owner</Form.Label>
                  <Col sm="10">
                    <Form.Control type="text" />
                  </Col>
                </Form.Group>
                <Form.Group as={Row} controlId="repo">
                  <Form.Label column sm="2">Repo</Form.Label>
                  <Col sm="10">
                    <Form.Control type="text" />
                  </Col>
                </Form.Group>
                <Button type="submit" variant="primary" size="lg">印刷用のPDFを作成</Button>
              </Form>
          }
        </header>
      </div>
    );
  }
}

export default App;
